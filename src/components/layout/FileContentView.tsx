import { useEffect, useRef } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'

// Standard languages
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'

import type { FileContent } from '../../../electron/shared/types'
import { Icon } from '../ui/Icon'

interface FileContentViewProps {
  content: FileContent | null
  loading?: boolean
}

function getLanguage(mimeType: string, path: string): string {
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
  
  if (mimeType.includes('typescript')) return 'typescript'
  if (mimeType.includes('javascript')) return 'javascript'
  if (mimeType.includes('json')) return 'json'
  if (mimeType.includes('markdown')) return 'markdown'
  
  return 'clike'
}

export function FileContentView({ content, loading }: FileContentViewProps) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current && content && !content.isBinary) {
      Prism.highlightElement(codeRef.current)
    }
  }, [content])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-400">
        Loading content…
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-400">
        Select a file to view its content
      </div>
    )
  }

  if (content.isBinary && content.mimeType.startsWith('image/')) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <div className="max-h-full max-w-full overflow-auto rounded-lg bg-neutral-100 p-8 dark:bg-neutral-800">
          <img
            src={content.content}
            alt={content.path}
            className="h-auto max-w-full shadow-lg"
          />
        </div>
        <div className="mt-4 text-[0.6875rem] text-neutral-500">
          {content.mimeType} • {(content.size / 1024).toFixed(1)} KB
        </div>
      </div>
    )
  }

  if (content.isBinary) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-xs text-neutral-400">
        <Icon name="file" size={48} className="text-neutral-200 dark:text-neutral-700" />
        <div>
          <p className="font-semibold text-neutral-600 dark:text-neutral-300">Binary File</p>
          <p className="mt-1">{content.mimeType}</p>
          <p className="mt-1">{(content.size / 1024).toFixed(1)} KB</p>
        </div>
        <p className="max-w-xs text-[0.625rem]">
          Binary file contents are not displayed in the GUI.
        </p>
      </div>
    )
  }

  const lang = getLanguage(content.mimeType, content.path)

  return (
    <div className="h-full overflow-auto bg-neutral-0 dark:bg-neutral-900 text-[0.8rem] leading-tight">
      <pre className={`language-${lang} m-0 h-full p-3 font-mono`}>
        <code ref={codeRef} className={`language-${lang}`}>
          {content.content}
        </code>
      </pre>
    </div>
  )
}
