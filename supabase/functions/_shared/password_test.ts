import { assert, assertEquals, assertNotEquals } from '@std/assert'
import { temporaryPassword } from './password.ts'

Deno.test('temporary passwords are 16 characters from the allowed alphabet', () => {
  const password = temporaryPassword()
  assertEquals(password.length, 16)
  assert(/^[A-HJ-NP-Za-km-z2-9]+$/.test(password))
})

Deno.test('two temporary passwords differ', () => {
  assertNotEquals(temporaryPassword(), temporaryPassword())
})
