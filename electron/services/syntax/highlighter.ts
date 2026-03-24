import { createHighlighter, Highlighter } from 'shiki'

let highlighter: Highlighter | null = null

export async function initHighlighter() {
  if (highlighter) return highlighter
  highlighter = await createHighlighter({
    themes: ['catppuccin-latte', 'catppuccin-mocha'],
    langs: [
      'typescript', 'javascript', 'tsx', 'jsx', 'json', 
      'markdown', 'css', 'html', 'bash', 'python', 
      'rust', 'go', 'cpp', 'c', 'java', 'text'
    ]
  })
  return highlighter
}

export async function highlightCode(code: string, lang: string, theme: 'light' | 'dark'): Promise<string> {
  const h = await initHighlighter()
  const shikiTheme = theme === 'light' ? 'catppuccin-latte' : 'catppuccin-mocha'
  
  // Map some common names to Shiki names if needed
  let shikiLang = lang.toLowerCase()
  if (shikiLang === 'clike') shikiLang = 'cpp' 
  
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
