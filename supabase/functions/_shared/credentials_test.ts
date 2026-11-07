import { assertEquals, assertRejects } from '@std/assert'
import { decryptPassword, encryptPassword } from './credentials.ts'

Deno.env.set('CREDENTIAL_KEY', btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))))

Deno.test('a stored password decrypts to the original and does not contain it', async () => {
  const stored = await encryptPassword('user-1', 'Tr0ub4dor-and-more')
  assertEquals(stored.includes('Tr0ub4dor'), false)
  assertEquals(await decryptPassword('user-1', stored), 'Tr0ub4dor-and-more')
})

Deno.test('a stored password does not decrypt for another account', async () => {
  const stored = await encryptPassword('user-1', 'secret-value-123')
  await assertRejects(() => decryptPassword('user-2', stored))
})
