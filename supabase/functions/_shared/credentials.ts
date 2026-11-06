// Passwords the Super Admin may view again, kept encrypted (AES-256-GCM) in staff_credentials. The key is the
// CREDENTIAL_KEY function secret (32 random bytes, base64), so a copy of the database alone shows nothing. Whoever holds
// the key and the database can read every stored password: keep the secret out of the repo, logs and chat.
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const unbase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

async function key() {
  const raw = Deno.env.get('CREDENTIAL_KEY')
  if (!raw) throw new Error('CREDENTIAL_KEY is not set')
  const bytes = unbase64(raw)
  if (bytes.length !== 32) throw new Error('CREDENTIAL_KEY must be 32 bytes, base64')
  return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

// The user id is authenticated data, so a stored value cannot be moved to another account and still decrypt.
export async function encryptPassword(userId: string, password: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(userId) }, await key(), encoder.encode(password)),
  )
  return `v1:${base64(iv)}:${base64(cipher)}`
}

export async function decryptPassword(userId: string, stored: string) {
  const [version, iv, cipher] = stored.split(':')
  if (version !== 'v1' || !iv || !cipher) throw new Error('unknown credential format')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unbase64(iv), additionalData: encoder.encode(userId) },
    await key(),
    unbase64(cipher),
  )
  return decoder.decode(plain)
}
