import DOMPurify from 'dompurify'

/**
 * Parses AniList flavored markdown & HTML (user bio, character/staff description, activity)
 * into sanitized, safe HTML.
 */
export function renderMarkdown(raw?: string | null): string {
  if (!raw) return ''

  let text = raw.trim()

  // 1. Strip outer codeblock fences if the user wrapped their entire markdown in ```markdown ... ```
  if (/^```(?:markdown)?\s*\n([\s\S]*?)\n```$/i.test(text)) {
    text = text.replace(/^```(?:markdown)?\s*\n([\s\S]*?)\n```$/i, '$1').trim()
  }

  // 2. AniList center block syntax: ~~~center ... ~~~
  text = text.replace(/~~~center\s*\n([\s\S]*?)\n~~~/gi, '<center>$1</center>')

  // 3. AniList custom image syntax: ~~~img200(url)~~~ or img200(url) or img(url)
  text = text.replace(
    /(?:~~~)?img(\d+)?(%|\s*px)?\((https?:\/\/[^\s)]+)\)(?:~~~)?/gi,
    (_match, size, unit, url) => {
      const width = size ? `${size}${unit || 'px'}` : '100%'
      return `<img src="${url}" alt="Image" style="max-width: ${width};" />`
    }
  )

  // 4. AniList spoilers: ~!spoiler text!~
  text = text.replace(/~!([\s\S]*?)!~/g, '<span class="spoiler">$1</span>')

  // 5. Headers (must be at start of line)
  text = text.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  text = text.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  text = text.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // 6. Horizontal rules
  text = text.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr />')

  // 7. Markdown images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" />')

  // 8. Markdown links: [text](url) -> formatted with description-link class for native routing/external browser
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" data-url="$2" class="description-link" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // 9. Bold-italic: ***text*** or ___text___
  text = text.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  text = text.replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>')

  // 10. Bold: **text** or __text__ (including colons e.g. __Agency:__ or **Non-anime roles:**)
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')

  // 11. Italic: *text* or _text_ (ensuring we do not match inside html tags or words)
  text = text.replace(/(^|[^\w*])\*([^*\n]+?)\*([^\w*]|$)/g, '$1<em>$2</em>$3')
  text = text.replace(/(^|[^\w_])_([^_\n]+?)_([^\w_]|$)/g, '$1<em>$2</em>$3')

  // 12. Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // 13. Lists: `- Item` or `* Item`
  text = text.replace(/^(\s*)[-*]\s+(.+)$/gm, '$1<span class="md-bullet">•</span> $2')

  // 14. Code blocks and inline code
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // 15. Preserve newlines as <br>
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/\n/g, '<br />')

  // 16. Clean up excessive breaks around block tags
  text = text.replace(/(<\/?(h[1-6]|pre|blockquote|center|hr|div|p|ul|ol|li)[^>]*>)<br\s*\/?>/gi, '$1')
  text = text.replace(/<br\s*\/?>(\s*<\/?(h[1-6]|pre|blockquote|center|hr|div|p|ul|ol|li))/gi, '$1')

  // 17. DOMPurify sanitize
  return DOMPurify.sanitize(text, {
    ADD_TAGS: ['center'],
    ADD_ATTR: ['target', 'rel', 'style', 'data-url', 'class'],
  })
}
