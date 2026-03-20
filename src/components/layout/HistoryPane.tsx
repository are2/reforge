import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GitCommit } from '../../../electron/shared/types'
import { Avatar } from '../ui/Avatar'
import { BranchChip } from '../ui/BranchChip'
import { Skeleton } from '../ui/Skeleton'
import { Icon } from '../ui/Icon'
import { CommitGraph, useGraphData } from './CommitGraph'
import { MergeBanner } from '../merge/MergeBanner'

interface HistoryPaneProps {
  commits: GitCommit[]
  selectedHash: string | null
  onSelect: (hash: string) => void
  loading?: boolean
  isMerging: boolean
  isRebasing: boolean
  isCherryPicking: boolean
  hasConflicts: boolean
  onResolveMerge: () => void
  onAbortMerge: () => void
  onContinueMerge: () => void
  onCherryPick: (hash: string) => void
  onCreateTag: (name: string, message: string, hash: string, push: boolean) => Promise<void>
  onRemoveTag: (name: string, push: boolean) => Promise<void>
}

function CreateTagFlyover({
  commit,
  onClose,
  onCreate,
  busy,
}: {
  commit: GitCommit
  onClose: () => void
  onCreate: (name: string, message: string, hash: string, push: boolean) => Promise<void>
  busy?: boolean
}) {
  const [tagName, setTagName] = useState('')
  const [message, setMessage] = useState('')
  const [push, setPush] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const validateTagName = (name: string) => {
    if (!name) return null
    if (/\s/.test(name)) return 'Tag name cannot contain spaces'
    if (/[~^:?*[\\]]/.test(name)) return 'Tag name contains invalid characters (~^:?*[\\])'
    if (name.includes('..')) return 'Tag name cannot contain ".." '
    if (name.startsWith('.') || name.endsWith('.')) return 'Tag name cannot start or end with a dot'
    if (name.startsWith('/') || name.endsWith('/')) return 'Tag name cannot start or end with a slash'
    return null
  }

  const error = validateTagName(tagName)

  const handleCreate = async () => {
    if (!tagName.trim() || error || isCreating) return
    setIsCreating(true)
    setCreateError(null)
    try {
      await onCreate(tagName.trim(), message.trim(), commit.hash, push)
      onClose()
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create tag')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div
      ref={formRef}
      className="absolute left-4 top-1/2 z-[60] -translate-y-1/2 w-[28rem] rounded-md border border-neutral-200 bg-neutral-0 p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="mb-4">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Create Tag</h2>
        <p className="text-[11px] text-neutral-500">Create annotated tag at the selected point</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Create tag at:</span>
          <span className="flex items-center gap-1 font-mono text-accent-blue">
            <Icon name="git" size={12} />
            {commit.shortHash}
          </span>
          <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
            {commit.subject}
          </span>
        </div>

        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-right">Tag Name:</label>
          <div className="relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400">
              <Icon name="tag" size={12} />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter tag name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full rounded border border-neutral-200 bg-neutral-50 py-1.5 pl-7 pr-2 text-xs text-neutral-900 focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          {error && (
            <p className="col-start-2 text-[10px] text-red-500">{error}</p>
          )}
        </div>


        <div className="grid grid-cols-[80px_1fr] items-start gap-2">
          <label className="mt-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 text-right">Message:</label>
          <textarea
            placeholder="Enter tag message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full resize-none rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        <label className="ml-[80px] flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={push}
            onChange={(e) => setPush(e.target.checked)}
            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900"
          />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">Push</span>
        </label>

        {createError && (
          <div className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="text-[10px] text-red-600 dark:text-red-400 leading-tight">
              {createError}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            disabled={!tagName.trim() || !!error || busy || isCreating}
            onClick={handleCreate}
            className="flex items-center justify-center gap-1.5 rounded bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50 min-w-[70px]"
          >
            {(busy || isCreating) && (
              <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
            )}
            <span>Create</span>
          </button>
          <button
            onClick={onClose}
            className="rounded border border-neutral-200 bg-neutral-0 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteTagFlyover({
  tagName,
  onClose,
  onDelete,
  busy,
}: {
  tagName: string
  onClose: () => void
  onDelete: (name: string, push: boolean) => Promise<void>
  busy?: boolean
}) {
  const [push, setPush] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(tagName, push)
      onClose()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove tag')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      ref={formRef}
      className="absolute left-4 top-1/2 z-[60] -translate-y-1/2 w-[24rem] rounded-md border border-neutral-200 bg-neutral-0 p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="mb-4">
        <h2 className="text-sm font-bold text-red-600">Remove Tag</h2>
        <p className="text-[11px] text-neutral-500">Are you sure you want to remove tag <span className="font-bold text-neutral-800 dark:text-neutral-100">{tagName}</span>?</p>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={push}
            onChange={(e) => setPush(e.target.checked)}
            className="rounded border-neutral-300 text-red-600 focus:ring-red-500 dark:border-neutral-600 dark:bg-neutral-900"
          />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">Also delete from remote (origin)</span>
        </label>

        {deleteError && (
          <div className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="text-[10px] text-red-600 dark:text-red-400 leading-tight">
              {deleteError}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            disabled={busy || isDeleting}
            onClick={handleDelete}
            className="flex items-center justify-center gap-1.5 rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 min-w-[70px]"
          >
            {(busy || isDeleting) && (
              <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
            )}
            <span>Remove</span>
          </button>
          <button
            onClick={onClose}
            className="rounded border border-neutral-200 bg-neutral-0 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function CommitRow({
  commit,
  isSelected,
  onSelect,
  graphRow,
  maxLane,
  onCherryPick,
  onAddTag,
  onRemoveTag,
}: {
  commit: GitCommit
  isSelected: boolean
  onSelect: () => void
  graphRow: { lane: number; activeLanes: number[]; connections: any[]; isRoot: boolean }
  maxLane: number
  onCherryPick: (hash: string) => void
  onAddTag: () => void
  onRemoveTag: (tagName: string, x: number, y: number) => void
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <button
        id={`commit-${commit.hash}`}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className={`flex w-full items-center gap-2 text-left ${
          isSelected
            ? 'bg-neutral-200 dark:bg-neutral-700'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        style={{ height: 28, lineHeight: '28px' }}
      >
      {/* Graph column – no padding, SVG fills full row height */}
      <div className="flex shrink-0 items-center self-stretch">
        <CommitGraph graphRow={graphRow} maxLane={maxLane} />
      </div>

      {/* Ref chips */}
      {commit.refs.length > 0 && (
        <div className="flex shrink-0 items-center gap-1">
          {commit.refs.map((ref) => (
            <BranchChip 
              key={ref.name} 
              name={ref.name} 
              type={ref.type === 'tag' ? 'tag' : ref.type === 'head' ? 'local' : ref.type} 
              onContextMenu={(e) => {
                if (ref.type === 'tag') {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemoveTag(ref.name, e.clientX, e.clientY)
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Subject */}
      <span className="min-w-0 flex-1 truncate text-xs text-neutral-900 dark:text-neutral-50">
        {commit.subject}
      </span>

      {/* Metadata columns */}
      <div className="flex shrink items-center gap-2 pr-2 sm:gap-3">
        {/* Author */}
        <div className="flex w-20 shrink items-center gap-1.5 truncate sm:w-28 lg:w-36">
          <div className="shrink-0">
            <Avatar
              initials={commit.author.initials}
              size="sm"
              variant="primary"
            />
          </div>
          <span className="truncate text-[0.6875rem] text-neutral-500 dark:text-neutral-300">
            {commit.author.name}
          </span>
        </div>

        {/* Hash */}
        <span className="w-12 shrink-0 truncate font-mono text-[0.6875rem] text-accent-blue sm:w-16">
          {commit.shortHash}
        </span>

        {/* Date */}
        <span className="w-20 shrink truncate text-right text-[0.6875rem] text-neutral-400 dark:text-neutral-500 sm:w-28 lg:w-36">
          {commit.authorDate}
        </span>
      </div>
    </button>

    {menu && createPortal(
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[160px] cursor-default rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-md dark:border-neutral-600 dark:bg-neutral-800"
        style={{ top: menu.y, left: menu.x }}
      >
        <button
          onClick={() => {
            setMenu(null)
            onCherryPick(commit.hash)
          }}
          className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
        >
          Cherry-pick commit
        </button>
        <button
          onClick={() => {
            setMenu(null)
            onAddTag()
          }}
          className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
        >
          Add tag
        </button>
      </div>,
      document.body
    )}
    </>
  )
}

function HistoryRowSkeleton() {
  return (
    <div className="flex h-[28px] items-center gap-2 px-3 border-b border-transparent">
      {/* Graph part */}
      <div className="flex w-12 shrink-0 items-center justify-center">
        <Skeleton circle width={8} height={8} />
      </div>
      {/* Subject */}
      <Skeleton className="h-3 flex-1 max-w-[400px]" />
      {/* Metatada */}
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton circle width={16} height={16} /> {/* Avatar */}
        <Skeleton className="h-3 w-20" /> {/* Author */}
        <Skeleton className="h-3 w-12" /> {/* Hash */}
        <Skeleton className="h-3 w-20" /> {/* Date */}
      </div>
    </div>
  )
}

export function HistoryPane({ 
  commits, 
  selectedHash, 
  onSelect, 
  loading,
  isMerging,
  isRebasing,
  isCherryPicking,
  hasConflicts,
  onResolveMerge,
  onAbortMerge,
  onContinueMerge,
  onCherryPick,
  onCreateTag,
  onRemoveTag
}: HistoryPaneProps) {
  const { rows, maxLane } = useGraphData(commits)
  const [tagTarget, setTagTarget] = useState<GitCommit | null>(null)
  const [deleteTagTarget, setDeleteTagTarget] = useState<string | null>(null)
  const [tagMenu, setTagMenu] = useState<{ name: string; x: number; y: number } | null>(null)
  const tagMenuRef = useRef<HTMLDivElement>(null)
  const isInternalInteraction = useRef(false)
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-scroll logic: when selectedHash changes, scroll to it, 
  // EXCEPT if the change was triggered by clicking *within* this pane.
  useEffect(() => {
    if (selectedHash && !isInternalInteraction.current) {
      const el = document.getElementById(`commit-${selectedHash}`)
      if (el) {
        // Scroll the selected commit to the top of the view
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [selectedHash])

  useEffect(() => {
    if (!tagMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setTagMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tagMenu])

  const handleSelect = (hash: string) => {
    isInternalInteraction.current = true
    onSelect(hash)
    
    if (resetTimeout.current) clearTimeout(resetTimeout.current)
    resetTimeout.current = setTimeout(() => {
      isInternalInteraction.current = false
    }, 100)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <MergeBanner
        isMerging={isMerging}
        isRebasing={isRebasing}
        isCherryPicking={isCherryPicking}
        hasConflicts={hasConflicts}
        onResolve={onResolveMerge}
        onAbort={onAbortMerge}
        onContinue={onContinueMerge}
      />

      {/* Header row */}
      <div className="flex h-6 shrink-0 items-center border-b border-neutral-200 px-3 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900">
        <span className="text-[0.625rem] font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
          History
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {loading && commits.length === 0 && (
          <div className="flex flex-col">
            {Array.from({ length: 20 }).map((_, i) => (
              <HistoryRowSkeleton key={i} />
            ))}
          </div>
        )}
        {!loading && commits.length === 0 && (
          <div className="flex items-center justify-center p-8 text-xs text-neutral-400">
            Open a repository to view commit history
          </div>
        )}
        {commits.map((commit) => {
          const graphRow = rows.get(commit.shortHash)
          if (!graphRow) return null
          return (
            <CommitRow
              key={commit.hash}
              commit={commit}
              isSelected={commit.hash === selectedHash}
              onSelect={() => handleSelect(commit.hash)}
              graphRow={graphRow}
              maxLane={maxLane}
              onCherryPick={onCherryPick}
              onAddTag={() => setTagTarget(commit)}
              onRemoveTag={(name, x, y) => setTagMenu({ name, x, y })}
            />
          )
        })}
      </div>

      {tagTarget && (
        <CreateTagFlyover
          commit={tagTarget}
          onClose={() => setTagTarget(null)}
          onCreate={onCreateTag}
          busy={loading}
        />
      )}

      {deleteTagTarget && (
        <DeleteTagFlyover
          tagName={deleteTagTarget}
          onClose={() => setDeleteTagTarget(null)}
          onDelete={onRemoveTag}
          busy={loading}
        />
      )}

      {tagMenu && createPortal(
        <div
          ref={tagMenuRef}
          className="fixed z-50 min-w-[160px] cursor-default rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-md dark:border-neutral-600 dark:bg-neutral-800"
          style={{ top: tagMenu.y, left: tagMenu.x }}
        >
          <button
            onClick={() => {
              setDeleteTagTarget(tagMenu.name)
              setTagMenu(null)
            }}
            className="flex w-full items-center px-3 py-1.5 text-xs text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            Remove tag
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
