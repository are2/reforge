export function getLanguage(mimeType: string, path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (ext === 'ts' || ext === 'tsx') return 'typescript'
  if (ext === 'js' || ext === 'jsx') return 'javascript'
  if (ext === 'json') return 'json'
  if (ext === 'md') return 'markdown'
  if (ext === 'css') return 'css'
  if (ext === 'html') return 'html'
  if (ext === 'sh' || ext === 'bash') return 'bash'
  if (ext === 'py') return 'python'
  if (ext === 'rs') return 'rust'
  if (ext === 'go') return 'go'
  if (ext === 'cs') return 'csharp'
  if (ext === 'java') return 'java'
  
  if (mimeType.includes('typescript')) return 'typescript'
  if (mimeType.includes('javascript')) return 'javascript'
  if (mimeType.includes('json')) return 'json'
  if (mimeType.includes('markdown')) return 'markdown'
  
  return 'clike'
}
