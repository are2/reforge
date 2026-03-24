import { useEffect, useState } from 'react'
import type { FileContent } from '../../../electron/shared/types'
import { Icon } from '../ui/Icon'
import { getLanguage } from '../../utils/syntax'

interface FileContentViewProps {
  content: FileContent | null
  loading?: boolean
}

export function FileContentView({ content, loading }: FileContentViewProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    window.system.getTheme().then(setTheme)
    window.system.onThemeUpdate(setTheme)
  }, [])

  useEffect(() => {
    let isMounted = true
    if (content && !content.isBinary) {
      const lang = getLanguage(content.mimeType, content.path)
      window.system.highlightCode(content.content, lang, theme).then(html => {
        if (isMounted) setHighlightedHtml(html)
      })
    } else {
      setHighlightedHtml(null)
    }
    return () => { isMounted = false }
  }, [content, theme])

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

  return (
    <div className="h-full overflow-auto bg-neutral-0 dark:bg-neutral-900 text-[0.8rem] leading-tight shiki-wrapper">
      {highlightedHtml ? (
        <div 
          className="h-full"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }} 
        />
      ) : (
        <pre className="m-0 h-full p-3 font-mono whitespace-pre opacity-50">
          <code>{content.content}</code>
        </pre>
      )}
      <style>{`
        .shiki-wrapper pre {
          margin: 0 !important;
          padding: 12px !important;
          background: transparent !important;
          height: 100% !important;
          font-family: var(--font-mono) !important;
          font-size: 0.8rem !important;
          line-height: 1.25 !important;
          font-weight: 400 !important;
          box-sizing: border-box !important;
          overflow-x: auto !important;
        }
        .shiki-wrapper pre code {
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }
      `}</style>
    </div>
  )
}
