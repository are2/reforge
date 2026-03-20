import { useState, useCallback, useRef, useEffect } from 'react'
import { FileStatusBadge } from '../ui/FileStatusBadge'
import { DiffViewer } from '../ui/DiffViewer'
import type { GitCommit, FileChange, FileDiff } from '../../../electron/shared/types'

const DIVIDER_STORAGE_KEY = 'commitChanges.dividerWidth'
const DEFAULT_FILE_LIST_WIDTH = 250
const MIN_FILE_LIST_WIDTH = 150
const MAX_FILE_LIST_WIDTH = 500

interface CommitChangesViewProps {
  commit: GitCommit
  selectedDiff: FileDiff | null
  loading?: boolean
  selectedPath: string | null // Externalized state
  onSelectFile: (filePath: string, revision: string) => void
}

export function CommitChangesView({ 
  commit, 
  selectedDiff, 
  loading, 
  selectedPath, 
  onSelectFile 
}: CommitChangesViewProps) {
  
  const [width, setWidth] = useState(() => {
    try {
      const stored = localStorage.getItem(DIVIDER_STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (parsed >= MIN_FILE_LIST_WIDTH && parsed <= MAX_FILE_LIST_WIDTH) return parsed
      }
    } catch { /* ignore */ }
    return DEFAULT_FILE_LIST_WIDTH
  })

  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.max(MIN_FILE_LIST_WIDTH, Math.min(MAX_FILE_LIST_WIDTH, startWidth.current + delta))
      setWidth(newWidth)
    }

    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setWidth((w) => {
        try { localStorage.setItem(DIVIDER_STORAGE_KEY, String(w)) } catch { /* ignore */ }
        return w
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleSelect = (file: FileChange) => {
    onSelectFile(file.path, commit.hash)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* File list */}
      <div 
        className="flex flex-col border-r border-neutral-200 bg-neutral-0 dark:border-neutral-600 dark:bg-neutral-900"
        style={{ width }}
      >
        <div className="flex h-7 shrink-0 items-center border-b border-neutral-200 px-3 py-1.5 dark:border-neutral-600">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Files ({commit.files.length})
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {commit.files.map((file) => (
            <button
              key={file.path}
              onClick={() => handleSelect(file)}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs ${
                selectedPath === file.path
                  ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <FileStatusBadge status={file.status} />
              <span className="truncate flex-1">{file.path}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 shrink-0 cursor-col-resize bg-neutral-100 transition-colors hover:bg-primary-400 dark:bg-neutral-800 dark:hover:bg-primary-600"
      />

      {/* Diff viewer */}
      <div className="flex min-w-0 flex-1 flex-col bg-neutral-0 dark:bg-neutral-900">
        <DiffViewer diff={selectedDiff} loading={loading} />
      </div>
    </div>
  )
}
