// Western digits with thousands separators in both languages (CLAUDE.md section 10).
export const formatAmount = (rupees: number) => rupees.toLocaleString('en-US')
