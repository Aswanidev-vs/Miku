import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
    expect(renderMarkdown('')).toBe('')
  })

  it('renders bold with colons and special characters like __Agency:__ and **Non-anime roles:**', () => {
    const input = '__Agency:__ I\'m Enterprise\n\n**Non-anime roles:**\n- Hator - Memento Mori (VG)'
    const result = renderMarkdown(input)
    expect(result).toContain('<strong>Agency:</strong> I\'m Enterprise')
    expect(result).toContain('<strong>Non-anime roles:</strong>')
    expect(result).toContain('<span class="md-bullet">•</span> Hator - Memento Mori (VG)')
  })

  it('renders bold, italic, strikethrough, and headers', () => {
    const input = '# Title\n**bold** *italic* ~~strike~~'
    const result = renderMarkdown(input)
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<del>strike</del>')
  })

  it('renders AniList custom image syntax img200 and ~~~img200', () => {
    const input1 = '~~~img200(https://s4.anilist.co/file/avatar.jpg)~~~'
    const res1 = renderMarkdown(input1)
    expect(res1).toContain('<img src="https://s4.anilist.co/file/avatar.jpg"')
    expect(res1).toContain('max-width: 200px')

    const input2 = 'img(https://s4.anilist.co/file/banner.jpg)'
    const res2 = renderMarkdown(input2)
    expect(res2).toContain('<img src="https://s4.anilist.co/file/banner.jpg"')
    expect(res2).toContain('max-width: 100%')
  })

  it('unwraps markdown codeblock fence and preserves HTML center tags from bio', () => {
    const input = '```markdown\n<center><b>✦ THE STORY ✦</b></center>\n~~~img200(https://anilist.co/img.jpg)~~~\n<center><i>PROLOGUE</i></center>\n```'
    const res = renderMarkdown(input)
    expect(res).not.toContain('```markdown')
    expect(res).toContain('<center><b>✦ THE STORY ✦</b></center>')
    expect(res).toContain('<center><i>PROLOGUE</i></center>')
    expect(res).toContain('<img src="https://anilist.co/img.jpg"')
  })

  it('renders spoilers', () => {
    const input = 'This is a ~!secret spoiler!~'
    const res = renderMarkdown(input)
    expect(res).toContain('<span class="spoiler">secret spoiler</span>')
  })

  it('renders links securely', () => {
    const input = '[AniList](https://anilist.co)'
    const res = renderMarkdown(input)
    expect(res).toContain('<a href="https://anilist.co" data-url="https://anilist.co" class="description-link"')
  })

  it('sanitizes malicious script tags and event handlers', () => {
    const input = '<script>alert(1)</script><img src="x" onerror="alert(2)">'
    const res = renderMarkdown(input)
    expect(res).not.toContain('<script>')
    expect(res).not.toContain('onerror')
  })
})
