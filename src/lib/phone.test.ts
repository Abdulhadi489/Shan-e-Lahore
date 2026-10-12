import { describe, expect, it } from 'vitest'
import { normalisePakistaniMobile } from './phone'

describe('normalisePakistaniMobile', () => {
  it.each([
    ['03001234567'],
    ['+92 300 1234567'],
    ['3001234567'],
    ['923001234567'],
    ['+923001234567'],
    ['0092 300 1234567'],
    ['0300-1234567'],
    ['(0300) 123 4567'],
    [' 0300 1234567 '],
    ['+92 0300 1234567'],
    ['۰۳۰۰۱۲۳۴۵۶۷'],
    ['٠٣٠٠١٢٣٤٥٦٧'],
  ])('accepts %j', (input) => {
    expect(normalisePakistaniMobile(input)).toBe('923001234567')
  })

  it.each([
    [''],
    ['   '],
    ['0421234567'],
    ['04235242650'],
    ['111000002'],
    ['0300123456'],
    ['030012345678'],
    ['00300123456'],
    ['+03001234567'],
    ['+44 300 1234567'],
    ['0300 12345a7'],
    ['0300+1234567'],
  ])('rejects %j', (input) => {
    expect(normalisePakistaniMobile(input)).toBeNull()
  })
})
