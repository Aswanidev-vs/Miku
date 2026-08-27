import DOMPurify from 'dompurify'

export function renderActivityHtml(html?: string | null): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
