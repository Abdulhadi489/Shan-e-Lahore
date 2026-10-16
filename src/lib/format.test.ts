import { expect, it } from 'vitest'
import { fromLahoreInput, toLahoreInput } from './format'

it('converts between database times and Lahore date-time inputs', () => {
  expect(toLahoreInput('2026-10-19T19:00:00+00:00')).toBe('2026-10-20T00:00')
  expect(fromLahoreInput('2026-10-20T00:00')).toBe('2026-10-19T19:00:00.000Z')
  expect(fromLahoreInput(toLahoreInput('2026-12-31T23:30:00Z'))).toBe('2026-12-31T23:30:00.000Z')
})
