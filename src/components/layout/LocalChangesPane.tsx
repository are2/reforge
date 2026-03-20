import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FileStatusBadge } from '../ui/FileStatusBadge'
import { Skeleton } from '../ui/Skeleton'
import { DiffViewer } from '../ui/DiffViewer'
import type { StatusEntry, FileDiff, GitCommit } from '../../../electron/shared/types'

const DIVIDER_STORAGE_KEY = 'localChanges.dividerWidth'
const DEFAULT_FILE_LIST_WIDTH = 288 // 18rem = 288px
const MIN_FILE_LIST_WIDTH = 200
const MAX_FILE_LIST_WIDTH = 600

// ── File list section ─────────────────────────────────────────

interface FileRowProps {
  entry: StatusEntry
  isSelected: boolean
  actionLabel: string
  onSelect: (entry: StatusEntry) => void
  onAction: (entry: StatusEntry) => void // stage or unstage single file
  onDiscard?: (entry: StatusEntry) => void // discard single file
}

function FileRow({ entry, isSelected, actionLabel, onSelect, onAction, onDiscard }: FileRowProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Prevent the same action firing more than once per second (guards against
  // rapid double-clicks while the git process still holds the index lock).
  const lastActionTime = useRef(0)

  useEffect(() => {
    if (!menu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  function fireAction() {
    const now = Date.now()
    if (now - lastActionTime.current < 300) return
    lastActionTime.current = now
    onAction(entry)
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault()
    fireAction()
  }

  function handleMenuAction() {
    setMenu(null)
    fireAction()
  }

  return (
    <>
      <button
        onClick={() => onSelect(entry)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs ${
          isSelected
            ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
        }`}
      >
        <FileStatusBadge status={entry.status} isIgnored={entry.isIgnored} />
        <span className="truncate flex-1">{entry.path}</span>
        {entry.isIgnored && (
          <span className="text-[0.625rem] text-neutral-400 dark:text-neutral-500 italic shrink-0">
            (ignored)
          </span>
        )}
      </button>

      {menu && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] cursor-default rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-md dark:border-neutral-600 dark:bg-neutral-800"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            onClick={handleMenuAction}
            className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          >
            {actionLabel}
          </button>
          {onDiscard && (
            <button
              onClick={() => {
                setMenu(null)
                onDiscard(entry)
              }}
              className="flex w-full items-center px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              Discard changes
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

function FileRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-2 px-3 py-1">
      <Skeleton circle width={12} height={12} className="shrink-0" />
      <Skeleton className="h-3 w-full max-w-[200px]" />
    </div>
  )
}

interface FileListProps {
  title: string
  entries: StatusEntry[]
  selectedPath: string | null
  /** Label for the "all" action, e.g. "Stage All" */
  actionLabel: string
  /** Label for the per-file action, e.g. "Stage file" */
  fileActionLabel: string
  loading?: boolean
  onSelect: (entry: StatusEntry) => void
  onAction: () => void
  onFileAction: (entry: StatusEntry) => void
  onDiscardFile?: (entry: StatusEntry) => void
}

function FileList({ title, entries, selectedPath, actionLabel, fileActionLabel, loading, onSelect, onAction, onFileAction, onDiscardFile }: FileListProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5 dark:border-neutral-600">
        <span className="text-[0.6875rem] font-semibold text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
        <span className="text-[0.625rem] text-neutral-400 dark:text-neutral-500">
          ({loading ? '...' : entries.length})
        </span>
        {!loading && entries.length > 0 && (
          <button
            onClick={onAction}
            className="ml-auto text-[0.625rem] font-medium text-accent-blue hover:text-accent-violet"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-1 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <FileRowSkeleton key={i} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-3 py-3 text-[0.6875rem] italic text-neutral-400 dark:text-neutral-500">
            No files
          </div>
        ) : (
          entries.map((entry) => (
            <FileRow
              key={`${entry.path}-${entry.staged}`}
              entry={entry}
              isSelected={selectedPath === entry.path}
              actionLabel={fileActionLabel}
              onSelect={onSelect}
              onAction={onFileAction}
              onDiscard={onDiscardFile}
            />
          ))
        )}
      </div>
    </div>
  )
}


// ── Commit bar ────────────────────────────────────────────────

function CommitBar({
  message,
  setMessage,
  canCommit,
  isAmending,
  onToggleAmend,
  onCommit,
}: {
  message: string
  setMessage: (m: string) => void
  canCommit: boolean
  isAmending: boolean
  onToggleAmend: (v: boolean) => void
  onCommit: (message: string) => Promise<void>
}) {
  const [isCommitting, setIsCommitting] = useState(false)

  const handleCommit = async () => {
    if (!canCommit || !message.trim() || isCommitting) return
    setIsCommitting(true)
    try {
      await onCommit(message)
      setMessage('')
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-200 p-2 dark:border-neutral-600">
      <div className="flex items-center">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={isAmending}
            onChange={(e) => onToggleAmend(e.target.checked)}
            disabled={isCommitting}
            className="h-3 w-3 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            Amend Last Commit
          </span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isCommitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleCommit()
            }
          }}
          placeholder="Commit message (Ctrl+Enter to commit)"
          className="min-w-0 flex-1 rounded border border-neutral-200 bg-neutral-0 px-2 py-1 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-primary-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-primary-500 disabled:opacity-50"
        />
        <button
          onClick={handleCommit}
          disabled={!canCommit || !message.trim() || isCommitting}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded bg-primary-500 px-3 py-1 text-xs font-medium text-neutral-0 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 min-w-[70px]"
        >
          {isCommitting && (
            <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
            </svg>
          )}
          <span>Commit</span>
        </button>
      </div>
    </div>
  )
}

// ── Resizable divider ─────────────────────────────────────────

function useDividerResize(initialWidth: number) {
  const [width, setWidth] = useState(() => {
    try {
      const stored = localStorage.getItem(DIVIDER_STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (parsed >= MIN_FILE_LIST_WIDTH && parsed <= MAX_FILE_LIST_WIDTH) return parsed
      }
    } catch { /* ignore */ }
    return initialWidth
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
      // Persist
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

  return { width, onMouseDown }
}

// ── Main pane ─────────────────────────────────────────────────

interface LocalChangesPaneProps {
  staged: StatusEntry[]
  unstaged: StatusEntry[]
  selectedDiff: FileDiff | null
  localChangesLoading?: boolean
  diffLoading?: boolean
  lastCommit?: GitCommit | null
  onSelectFile: (filePath: string, staged: boolean, amend?: boolean) => void
  onStageFile: (filePath: string, isIgnored?: boolean) => void
  onUnstageFile: (filePath: string) => void
  onDiscardFile: (filePath: string) => void
  onCommit: (message: string, amend?: boolean) => Promise<void>
}

export function LocalChangesPane({
  staged,
  unstaged,
  selectedDiff,
  localChangesLoading,
  diffLoading,
  lastCommit,
  onSelectFile,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  onCommit,
}: LocalChangesPaneProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isAmending, setIsAmending] = useState(false)

  const handleToggleAmend = useCallback((val: boolean) => {
    setIsAmending(val)
    if (val && lastCommit) {
      const msg = lastCommit.subject + (lastCommit.body.length ? '\n\n' + lastCommit.body.join('\n') : '')
      setMessage(msg)
    } else {
      // Keep message if user had started typing before checking amend, 
      // or clear it if restoring from amend? Usually better not to erase 
      // user input if they typed something, but simplified here.
      if (message === (lastCommit?.subject + (lastCommit?.body.length ? '\n\n' + lastCommit.body.join('\n') : ''))) {
        setMessage('')
      }
    }
  }, [lastCommit, message])

  const [showIgnoredFiles, setShowIgnoredFiles] = useState(() => {
    try {
      const stored = localStorage.getItem('localChanges.showIgnored')
      return stored === 'true'
    } catch {
      return true
    }
  })

  const { width: fileListWidth, onMouseDown } = useDividerResize(DEFAULT_FILE_LIST_WIDTH)

  const handleToggleIgnored = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked
    setShowIgnoredFiles(val)
    try {
      localStorage.setItem('localChanges.showIgnored', String(val))
    } catch { /* ignore */ }
  }, [])

  const filteredUnstaged = useMemo(
    () => (showIgnoredFiles ? unstaged : unstaged.filter((e) => !e.isIgnored)),
    [unstaged, showIgnoredFiles],
  )

  const effectiveStaged = useMemo(() => {
    let result = [...staged]
    if (isAmending && lastCommit) {
      const stagedPaths = new Set(staged.map(f => f.path))
      for (const fc of lastCommit.files) {
        if (!stagedPaths.has(fc.path)) {
          result.push({
            path: fc.path,
            status: fc.status,
            oldPath: fc.oldPath,
            staged: true,
          })
        }
      }
    }
    return result
  }, [staged, isAmending, lastCommit])

  const filteredStaged = useMemo(
    () => (showIgnoredFiles ? effectiveStaged : effectiveStaged.filter((e) => !e.isIgnored)),
    [effectiveStaged, showIgnoredFiles],
  )

  const handleSelect = useCallback(
    (entry: StatusEntry) => {
      setSelectedPath(entry.path)
      onSelectFile(entry.path, entry.staged, isAmending)
    },
    [onSelectFile, isAmending],
  )

  const handleStageAll = useCallback(async () => {
    for (const e of filteredUnstaged) {
      await onStageFile(e.path, e.isIgnored)
    }
  }, [filteredUnstaged, onStageFile])

  const handleUnstageAll = useCallback(async () => {
    // If amending, we might not want to 'unstage' files that were in the previous commit
    // since 'unstage' would normally remove them from the index.
    // For now we just run unstageFile for all.
    for (const e of filteredStaged) {
      await onUnstageFile(e.path)
    }
  }, [filteredStaged, onUnstageFile])

  const handleCommitWrapper = useCallback(async (msg: string) => {
    await onCommit(msg, isAmending)
    setIsAmending(false)
  }, [onCommit, isAmending])

  return (
    <div className="flex h-full min-h-0">
      {/* Left column: unstaged (top) + staged (bottom) + commit bar */}
      <div
        className="flex shrink-0 flex-col bg-neutral-0 dark:bg-neutral-900"
        style={{ width: fileListWidth }}
      >
        {/* Header with Toggle */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/50 px-3 py-1.5 dark:border-neutral-600 dark:bg-neutral-800/50">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Local Changes
          </span>
          <label className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <input
              type="checkbox"
              checked={showIgnoredFiles}
              onChange={handleToggleIgnored}
              className="h-3 w-3 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
            />
            <span className="text-[0.625rem] font-medium text-neutral-500 dark:text-neutral-400">
              Show Ignored
            </span>
          </label>
        </div>

        {/* Unstaged files (top) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <FileList
            title="Unstaged"
            entries={filteredUnstaged}
            selectedPath={selectedPath}
            onSelect={handleSelect}
            actionLabel="Stage All"
            fileActionLabel="Stage file"
            loading={localChangesLoading}
            onAction={handleStageAll}
            onFileAction={(e) => onStageFile(e.path, e.isIgnored)}
            onDiscardFile={(e) => onDiscardFile(e.path)}
          />
        </div>

        {/* Staged files (bottom) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-neutral-200 dark:border-neutral-600">
          <FileList
            title="Staged"
            entries={filteredStaged}
            selectedPath={selectedPath}
            onSelect={handleSelect}
            actionLabel="Unstage All"
            fileActionLabel="Unstage file"
            loading={localChangesLoading}
            onAction={handleUnstageAll}
            onFileAction={(e) => onUnstageFile(e.path)}
            onDiscardFile={(e) => onDiscardFile(e.path)}
          />
        </div>

        {/* Commit bar */}
        <CommitBar
          message={message}
          setMessage={setMessage}
          canCommit={effectiveStaged.length > 0}
          isAmending={isAmending}
          onToggleAmend={handleToggleAmend}
          onCommit={handleCommitWrapper}
        />
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 shrink-0 cursor-col-resize border-x border-neutral-200 bg-neutral-100 transition-colors hover:bg-primary-400 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-primary-600"
      />

      <div className="flex min-w-0 flex-1 flex-col bg-neutral-0 dark:bg-neutral-900">
        <DiffViewer diff={selectedDiff} loading={diffLoading} />
      </div>
    </div>
  )
}
