import { createHighlighter, Highlighter } from 'shiki'

let highlighter: Highlighter | null = null

export async function initHighlighter() {
  if (highlighter) return highlighter
  highlighter = await createHighlighter({
    themes: ['catppuccin-latte', 'catppuccin-mocha'],
    langs: [
      'typescript', 'javascript', 'tsx', 'jsx', 'json', 
      'markdown', 'css', 'html', 'bash', 'python', 
      'rust', 'go', 'cpp', 'c', 'java', 'csharp', 'text'
    ]
  })
  return highlighter
}

export async function highlightCode(code: string, lang: string, theme: 'light' | 'dark'): Promise<string> {
  const h = await initHighlighter()
  const shikiTheme = theme === 'light' ? 'catppuccin-latte' : 'catppuccin-mocha'
  
  // Map some common names to Shiki names if needed
  let shikiLang = lang.toLowerCase()
  if (shikiLang === 'clike' || shikiLang === 'cs') shikiLang = 'csharp' 
  
  try {
    return h.codeToHtml(code, {
      lang: shikiLang,
      theme: shikiTheme
    })
  } catch (e) {
    console.warn(`Shiki highlighting failed for lang: ${lang}, falling back to text`, e)
    return h.codeToHtml(code, {
      lang: 'text',
      theme: shikiTheme
    })
  }
}

export async function highlightLines(lines: string[], lang: string, theme: 'light' | 'dark'): Promise<string[]> {
  const h = await initHighlighter()
  const shikiTheme = theme === 'light' ? 'catppuccin-latte' : 'catppuccin-mocha'
  
  let shikiLang = lang.toLowerCase()
  if (shikiLang === 'clike' || shikiLang === 'cs') shikiLang = 'csharp'
  if (!h.getLoadedLanguages().includes(shikiLang)) {
    shikiLang = 'text'
  }

  const fullCode = lines.join('\n')
  const tokenLines = h.codeToTokens(fullCode, {
    lang: shikiLang as any,
    theme: shikiTheme as any
  }).tokens

  // Convert each line of tokens to a string of HTML spans
  return tokenLines.map(lineTokens => {
    let html = '<span class="line">'
    for (const token of lineTokens) {
      const escaped = token.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      
      const style = token.color ? `style="color: ${token.color}"` : ''
      html += `<span ${style}>${escaped}</span>`
    }
    html += '</span>'
    return html
  })
}
