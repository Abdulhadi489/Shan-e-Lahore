import { assertEquals } from '@std/assert'
import { normalisePakistaniMobile } from './phone.ts'

Deno.test('accepts the common ways of typing a Pakistani mobile number', () => {
  for (const input of [
    '03001234567', '+92 300 1234567', '3001234567', '923001234567', '+923001234567', '0092 300 1234567',
    '0300-1234567', '(0300) 123 4567', ' 0300 1234567 ', '+92 0300 1234567', '۰۳۰۰۱۲۳۴۵۶۷', '٠٣٠٠١٢٣٤٥٦٧',
  ]) {
    assertEquals(normalisePakistaniMobile(input), '923001234567', input)
  }
})

Deno.test('rejects landlines, wrong lengths and junk', () => {
  for (const input of [
    '', '   ', '0421234567', '04235242650', '111000002', '0300123456', '030012345678', '00300123456',
    '+03001234567', '+44 300 1234567', '0300 12345a7', '0300+1234567',
  ]) {
    assertEquals(normalisePakistaniMobile(input), null, input)
  }
})
