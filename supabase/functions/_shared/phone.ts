// Urdu keyboards type Extended Arabic-Indic digits (۰–۹); some phones type Arabic-Indic (٠–٩).
function toWesternDigits(input: string) {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

// Returns the 923XXXXXXXXX form the database requires, or null if this is not a Pakistani mobile number.
// Same rule as the database CHECK (^923\d{9}$); landlines are rejected because customers get WhatsApp messages.
export function normalisePakistaniMobile(input: string): string | null {
  const compact = toWesternDigits(input).replace(/[\s().-]/g, '')
  const match = /^(?:\+92|0092|92)?0?(3\d{9})$/.exec(compact)
  return match ? `92${match[1]}` : null
}

// The restaurant's own number may also be a landline or UAN: 92 then 9 to 11 digits, like the
// database CHECK on branches.phone. Accepts 042 35242650, +92 42 35242650 and mobiles.
export function normalisePakistaniPhone(input: string): string | null {
  const compact = toWesternDigits(input).replace(/[\s().+-]/g, '')
  const match = /^(?:0092|92|0)?([1-9]\d{8,10})$/.exec(compact)
  return match ? `92${match[1]}` : null
}
