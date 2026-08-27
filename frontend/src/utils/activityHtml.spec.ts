import { describe, it, expect } from 'vitest'
import { renderActivityHtml } from './activityHtml'

describe('renderActivityHtml', () => {
  it('strips script tags', () => {
    const out = renderActivityHtml('<p>hi</p><script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
    expect(out).toContain('<p>hi</p>')
  })

  it('strips onerror attributes', () => {
    const out = renderActivityHtml('<img src="x" onerror="alert(1)">')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('alert(1)')
  })

  it('keeps links and basic formatting', () => {
    const out = renderActivityHtml('<b>bold</b> <a href="https://anilist.co">link</a>')
    expect(out).toContain('<b>bold</b>')
    expect(out).toContain('<a href="https://anilist.co">link</a>')
  })

  it('returns an empty string for null, undefined or empty input', () => {
    expect(renderActivityHtml(null)).toBe('')
    expect(renderActivityHtml(undefined)).toBe('')
    expect(renderActivityHtml('')).toBe('')
  })
})
