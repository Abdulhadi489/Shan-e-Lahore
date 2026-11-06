// One-time passwords for new and reset logins. 16 characters from an alphabet without look-alikes (0/O, 1/l/I),
// drawn with rejection sampling so every character is equally likely. About 93 bits, far above the 12-character minimum.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function temporaryPassword(length = 16) {
  const limit = 256 - (256 % alphabet.length)
  let result = ''
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && result.length < length) result += alphabet[byte % alphabet.length]
    }
  }
  return result
}
