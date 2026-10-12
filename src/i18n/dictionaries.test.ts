import { describe, expect, it } from 'vitest'
import en from './en.json'
import ur from './ur.json'

function keyPaths(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null ? keyPaths(child, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

describe('translation dictionaries', () => {
  it('has an Urdu string for every customer-facing English string (the admin panel is English only)', () => {
    const customerKeys = keyPaths(en).filter((path) => !path.startsWith('admin.'))
    expect(keyPaths(ur).sort()).toEqual(customerKeys.sort())
  })
})
