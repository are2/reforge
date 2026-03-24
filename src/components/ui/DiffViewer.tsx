import { useEffect, useState, useMemo } from 'react'
import type { FileDiff } from '../../../electron/shared/types'
import { Icon } from './Icon'
import { getLanguage } from '../../utils/syntax'

function formatSize(bytes?: number): string {
  if (bytes === undefined) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface DiffViewerProps {
  diff: FileDiff | null
  loading?: boolean
}

export function DiffViewer({ diff, loading }: DiffViewerProps) {
  const [highlightingEnabled, setHighlightingEnabled] = useState(false)
  const [highlightedLines, setHighlightedLines] = useState<string[] | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    window.system.getTheme().then(setTheme)
    window.system.onThemeUpdate(setTheme)
    window.system.getDiffSyntaxHighlighting().then(setHighlightingEnabled)
  }, [])

  // Flatten all lines from all hunks for bulk highlighting
  const allLines = useMemo(() => {
    if (!diff) return []
    return diff.hunks.flatMap(hunk => hunk.lines.map(line => line.content))
  }, [diff])

  useEffect(() => {
    let isMounted = true
    if (highlightingEnabled && diff && !diff.isBinary && allLines.length > 0) {
      const lang = getLanguage('', diff.path)
      window.system.highlightLines(allLines, lang, theme).then(results => {
        if (isMounted) {
          // Strip Shiki's <pre><code> wrappers
          const stripped = results.map(html => 
            html.replace(/^<pre[^>]*><code[^>]*>/, '').replace(/<\/code><\/pre>$/, '')
          )
          setHighlightedLines(stripped)
        }
      })
    } else {
      setHighlightedLines(null)
    }
    return () => { isMounted = false }
  }, [allLines, highlightingEnabled, theme, diff])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-neutral-400 dark:text-neutral-500">
        Loading diff…
      </div>
    )
  }

  if (!diff) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-neutral-400 dark:text-neutral-500">
        Select a file to view changes
      </div>
    )
  }

  if (diff.isBinary) {
    if (diff.mimeType?.startsWith('image/') && diff.binaryContent) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-4">
          <div className="max-h-full max-w-full overflow-auto rounded-lg bg-neutral-100 p-8 dark:bg-neutral-800">
            <img
              src={diff.binaryContent}
              alt={diff.path}
              className="h-auto max-w-full shadow-lg"
            />
          </div>
          <div className="mt-4 text-[0.6875rem] text-neutral-500">
            {diff.mimeType} • {formatSize(diff.size)}
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-xs text-neutral-400">
        <Icon name="file" size={48} className="text-neutral-200 dark:text-neutral-700" />
        <div>
          <p className="font-semibold text-neutral-600 dark:text-neutral-300">Binary File</p>
          <p className="mt-1">{diff.mimeType || 'application/octet-stream'}</p>
          <p className="mt-1">{formatSize(diff.size)}</p>
        </div>
        <p className="max-w-xs text-[0.625rem]">
          Binary file contents are not displayed as text.
        </p>
      </div>
    )
  }

  if (diff.hunks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-neutral-400 dark:text-neutral-500">
        No changes in this file
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto font-mono text-xs leading-5">
      {diff.hunks.map((hunk, hi) => (
        <div key={hi}>
          {/* Hunk header */}
          <div className="diff-hunk-header sticky top-0 px-3 py-0.5 text-[0.6875rem] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border-y border-neutral-200 dark:border-neutral-700">
            {hunk.header}
          </div>
          {/* Lines */}
          {hunk.lines.map((line, li) => {
            const bgClass =
              line.type === 'add'
                ? 'diff-add bg-emerald-500/10'
                : line.type === 'remove'
                  ? 'diff-remove bg-rose-500/10'
                  : ''

            // Calculate global line index across all hunks
            let lineIndex = li
            for (let i = 0; i < hi; i++) {
              lineIndex += diff.hunks[i].lines.length
            }

            const hLine = highlightedLines ? highlightedLines[lineIndex] : null

            return (
              <div key={li} className={`flex ${bgClass}`}>
                {/* Old line number */}
                <span className="inline-block w-10 shrink-0 select-none pr-1 text-right text-neutral-400 dark:text-neutral-500">
                  {line.oldLineNo ?? ''}
                </span>
                  {/* New line number */}
                  <span className="inline-block w-10 shrink-0 select-none pr-1 text-right text-neutral-400 dark:text-neutral-500">
                    {line.newLineNo ?? ''}
                  </span>
                  {/* Indicator */}
                  <span className={`inline-block w-4 shrink-0 select-none text-center ${
                    line.type === 'add' ? 'text-emerald-500' : line.type === 'remove' ? 'text-rose-500' : 'text-neutral-400'
                  }`}>
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                  </span>
                  {/* Content */}
                  {hLine ? (
                    <span 
                      className="whitespace-pre-wrap break-all pr-3 shiki-line-content" 
                      dangerouslySetInnerHTML={{ __html: hLine }} 
                    />
                  ) : (
                    <span className="whitespace-pre-wrap break-all pr-3">{line.content}</span>
                  )}
                </div>
              )
            })
          }
        </div>
      ))}
      <style>{`
        .shiki-line-content pre {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          font-family: inherit !important;
          font-size: inherit !important;
        }
        .shiki-line-content .line {
          display: inline !important;
        }
      `}</style>
    </div>
  )
}
