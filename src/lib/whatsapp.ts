// Prefilled WhatsApp chat links (CLAUDE.md section 12): the text is always URL-encoded.
export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
