import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../ui/Icon'
import { Skeleton } from '../ui/Skeleton'
import type {
  GitBranch,
  GitRemote,
  GitTag,
  GitStash,
  GitSubmodule,
} from '../../../electron/shared/types'

// ── Collapsible tree section ───────────────────────────────────

interface TreeSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function TreeSection({ title, defaultOpen = true, children }: TreeSectionProps) {
  const [open, setOpen] = useState(() => {
    // Basic persistence using localStorage
    const saved = localStorage.getItem(`sidebar-tree-${title.toLowerCase()}`)
    if (saved !== null) {
      return saved === 'open'
    }
    return defaultOpen
  })

  const toggleOpen = () => {
    const nextState = !open
    setOpen(nextState)
    localStorage.setItem(`sidebar-tree-${title.toLowerCase()}`, nextState ? 'open' : 'closed')
  }

  return (
    <div>
      <button
        onClick={toggleOpen}
        className="flex w-full items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
      >
        <Icon name={open ? 'chevron-down' : 'chevron'} size={10} />
        <span>{title}</span>
      </button>
      {open && <div className="pl-3">{children}</div>}
    </div>
  )
}

function SidebarItemSkeleton() {
  return (
    <div className="flex items-center gap-2 py-1 pl-4 pr-2">
      <Skeleton circle width={10} height={10} className="shrink-0" />
      <Skeleton className="h-3 w-full max-w-[120px]" />
    </div>
  )
}

interface LeftSidebarProps {
  activeBranch: string
  branches: GitBranch[]
  remotes: GitRemote[]
  tags: GitTag[]
  stashes: GitStash[]
  submodules: GitSubmodule[]
  localChangesCount: number
  activeView: 'history' | 'localChanges'
  loading?: boolean
  onViewChange: (view: 'history' | 'localChanges') => void
  onBranchSelect: (tip: string) => void
  onActiveBranchChange: (name: string) => void
  onMerge: (name: string) => void
  onRebase: (name: string) => void
  onDelete: (name: string) => void
  onPull: (branch: string, rebase: boolean) => Promise<void>
  onPush: (branch: string, force: boolean) => Promise<void>
  onRemoveTag: (name: string, push: boolean) => Promise<void>
  onDeleteRemoteBranch: (remote: string, branch: string) => Promise<void>
  onCheckoutRemoteBranch?: (remote: string, branch: string) => Promise<void>
  onStashApply: (index: number) => Promise<void>
  onStashPop: (index: number) => Promise<void>
  onStashDrop: (index: number) => Promise<void>
  onTrackingSet: (branch: string, upstream: string) => Promise<void>
  onTrackingUnset: (branch: string) => Promise<void>
}

// ── Branch tree item ───────────────────────────────────────────

function BranchItem({
  branch,
  depth = 0,
  fullName,
  activeBranch,
  onBranchSelect,
  onActiveBranchChange,
  onMerge,
  onRebase,
  onDelete,
  onPull,
  onPush,
  remotes,
  onTrackingSet,
  onTrackingUnset,
}: {
  branch: GitBranch
  depth?: number
  /** Fully qualified branch name (e.g. "feature/api"). */
  fullName: string
  activeBranch: string
  remotes: GitRemote[]
  onBranchSelect: (tip: string) => void
  onActiveBranchChange: (name: string) => void
  onMerge: (name: string) => void
  onRebase: (name: string) => void
  onDelete: (name: string) => void
  onPull: (branch: string, rebase: boolean) => Promise<void>
  onPush: (branch: string, force: boolean) => Promise<void>
  onTrackingSet: (branch: string, upstream: string) => Promise<void>
  onTrackingUnset: (branch: string) => Promise<void>
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = branch.children && branch.children.length > 0
  const isActive = !hasChildren && activeBranch === fullName

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTrackingSubmenu, setShowTrackingSubmenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
        setShowDeleteConfirm(false)
        setShowTrackingSubmenu(false)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  function handleClick() {
    if (hasChildren) {
      setOpen(!open)
    } else if (branch.tip) {
      onBranchSelect(branch.tip)
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (hasChildren) return
    e.preventDefault()
    onActiveBranchChange(fullName)
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (hasChildren) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
    setShowDeleteConfirm(false)
    setShowTrackingSubmenu(false)
  }

  function handleCheckout() {
    onActiveBranchChange(fullName)
    setContextMenu(null)
  }

  function handleMerge() {
    onMerge(fullName)
    setContextMenu(null)
  }

  function handleRebase() {
    onRebase(fullName)
    setContextMenu(null)
  }

  function handlePull() {
    onPull(branch.name, false)
    setContextMenu(null)
  }

  function handlePush() {
    onPush(branch.name, false)
    setContextMenu(null)
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  function handleConfirmDelete() {
    onDelete(fullName)
    setContextMenu(null)
    setShowDeleteConfirm(false)
  }

  function handleTrackingSet(upstream: string) {
    onTrackingSet(fullName, upstream)
    setContextMenu(null)
    setShowTrackingSubmenu(false)
  }

  function handleTrackingUnset() {
    onTrackingUnset(fullName)
    setContextMenu(null)
    setShowTrackingSubmenu(false)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ paddingLeft: `${(depth + 1) * 0.625}rem` }}
        className={`flex w-full items-center gap-1 py-0.5 pr-2 text-xs ${
          isActive
            ? 'bg-neutral-200 font-bold text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50'
        }`}
      >
        {hasChildren ? (
          <Icon name={open ? 'chevron-down' : 'chevron'} size={10} />
        ) : (
          <span className="w-2.5" />
        )}
        <Icon name={hasChildren ? 'folder' : 'branch'} size={12} className="text-neutral-400 dark:text-neutral-500" />
        <span className="truncate">{branch.name}</span>
        {branch.ahead !== undefined && branch.ahead > 0 && (
          <span className="ml-1 flex items-center gap-0.5 text-[0.625rem] text-green-600 dark:text-green-400">
            <Icon name="arrow-up" size={8} />
            {branch.ahead}
          </span>
        )}
        {branch.behind !== undefined && branch.behind > 0 && (
          <span className="ml-1 flex items-center gap-0.5 text-[0.625rem] text-orange-600 dark:text-orange-400">
            <Icon name="arrow-down" size={8} />
            {branch.behind}
          </span>
        )}
        {isActive && (
          <span className="ml-auto text-[0.5625rem] text-primary-500">✓</span>
        )}
      </button>
      {open && hasChildren && branch.children!.map((child) => {
        const childFullName = `${fullName}/${child.name}`
        return (
          <BranchItem
            key={child.name}
            branch={child}
            depth={depth + 1}
            fullName={childFullName}
            activeBranch={activeBranch}
            remotes={remotes}
            onBranchSelect={onBranchSelect}
            onActiveBranchChange={onActiveBranchChange}
            onMerge={onMerge}
            onRebase={onRebase}
            onDelete={onDelete}
            onPull={onPull}
            onPush={onPush}
            onTrackingSet={onTrackingSet}
            onTrackingUnset={onTrackingUnset}
          />
        )
      })}
      
      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-50 cursor-default rounded-md border border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 ${
            showDeleteConfirm ? 'w-64 p-3' : 'min-w-[160px] py-1 shadow-md'
          }`}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Delete Local Branch</h3>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                Are you sure you want to delete branch <span className="font-semibold text-neutral-900 dark:text-neutral-50">'{branch.name}'</span>?
              </p>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => {
                    setContextMenu(null)
                    setShowDeleteConfirm(false)
                  }}
                  className="rounded px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="rounded bg-red-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleCheckout}
                className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
              >
                Checkout {fullName}
              </button>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-600" />
              <button
                onClick={handlePull}
                className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
              >
                Pull {branch.upstream ? `'${branch.upstream}'` : `'${branch.name}'`}...
              </button>
              <button
                onClick={handlePush}
                className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
              >
                Push '{branch.name}' {branch.upstream?.includes('/') ? `to '${branch.upstream.split('/')[0]}'` : ''}...
              </button>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-600" />
              <button
                onClick={handleMerge}
                className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
              >
                Merge '{branch.name}' into '{activeBranch}'
              </button>
              <button
                onClick={handleRebase}
                className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
              >
                Rebase '{activeBranch}' on '{branch.name}'
              </button>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-600" />
              <div
                className="relative group w-full"
                onMouseEnter={() => setShowTrackingSubmenu(true)}
                onMouseLeave={() => setShowTrackingSubmenu(false)}
              >
                <button
                  className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 justify-between"
                >
                  <span>Tracking</span>
                  <Icon name="chevron" size={10} className="opacity-50" />
                </button>
                {showTrackingSubmenu && (
                  <div className="absolute left-full top-[-4px] min-w-[160px] py-1 shadow-md rounded-md border border-neutral-200 bg-neutral-0 dark:border-neutral-700 dark:bg-neutral-800" style={{ marginLeft: '-4px' }}>
                    <button
                      disabled={!branch.upstream}
                      onClick={handleTrackingUnset}
                      className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 disabled:opacity-50"
                    >
                      Remove tracking reference
                    </button>
                    <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-600" />
                    {remotes.length === 0 && (
                      <div className="px-3 py-1.5 text-xs text-neutral-400 italic">No remotes</div>
                    )}
                    <div className="max-h-[200px] overflow-y-auto">
                    {remotes.map(remote => (
                      remote.branches.map(b => {
                        const remoteBranchName = `${remote.name}/${b}`
                        const isTracked = branch.upstream === remoteBranchName
                        return (
                          <button
                            key={remoteBranchName}
                            onClick={() => handleTrackingSet(remoteBranchName)}
                            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
                          >
                            <span className="w-3 shrink-0 flex items-center justify-center">
                              {isTracked && <Icon name="check" size={10} className="text-primary-500" />}
                            </span>
                            <span className="truncate">{remoteBranchName}</span>
                          </button>
                        )
                      })
                    ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-600" />
              <button
                onClick={handleDelete}
                disabled={isActive}
                className="flex w-full items-center px-3 py-1.5 text-xs text-red-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-neutral-700"
              >
                Delete '{branch.name}'
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Tag tree item ──────────────────────────────────────────────

function TagItem({
  tag,
  onRemoveTag,
}: {
  tag: GitTag
  onRemoveTag: (name: string, push: boolean) => Promise<void>
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [push, setPush] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
        setShowDeleteConfirm(false)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
    setShowDeleteConfirm(false)
  }

  const handleConfirmDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    setError(null)
    try {
      await onRemoveTag(tag.name, push)
      setContextMenu(null)
      setShowDeleteConfirm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to remove tag')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div
        onContextMenu={handleContextMenu}
        className="flex w-full items-center gap-1 py-0.5 pl-5 pr-2 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
      >
        <Icon name="tag" size={12} className="text-neutral-400 dark:text-neutral-500" />
        <span className="truncate">{tag.name}</span>
      </div>

      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-50 cursor-default rounded-md border border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 ${
            showDeleteConfirm ? 'w-64 p-3' : 'min-w-[160px] py-1 shadow-md'
          }`}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Remove Tag</h3>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                Are you sure you want to remove tag <span className="font-semibold text-neutral-900 dark:text-neutral-50">'{tag.name}'</span>?
              </p>
              
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={push}
                  onChange={(e) => setPush(e.target.checked)}
                  className="rounded border-neutral-300 text-red-600 focus:ring-red-500 dark:border-neutral-600 dark:bg-neutral-900"
                />
                <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Also delete from remote</span>
              </label>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-900/50 dark:bg-red-900/20 mt-2">
                  <p className="text-[10px] text-red-600 dark:text-red-400 leading-tight">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  disabled={isDeleting}
                  onClick={() => {
                    setContextMenu(null)
                    setShowDeleteConfirm(false)
                  }}
                  className="rounded px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center justify-center gap-1.5 rounded bg-red-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting && (
                    <svg className="git-spinner h-2.5 w-2.5 text-white/90" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                  )}
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center px-3 py-1.5 text-xs text-red-600 hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-700"
            >
              Remove tag
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Remote branch tree item ─────────────────────────────────────

function RemoteBranchItem({
  remoteName,
  branchName,
  tip,
  onBranchSelect,
  onDeleteRemoteBranch,
  onCheckoutRemoteBranch,
}: {
  remoteName: string
  branchName: string
  tip: string
  onBranchSelect: (tip: string) => void
  onDeleteRemoteBranch: (remote: string, branch: string) => Promise<void>
  onCheckoutRemoteBranch?: (remote: string, branch: string) => Promise<void>
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
        setShowDeleteConfirm(false)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
    setShowDeleteConfirm(false)
  }
  const handleConfirmDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    setError(null)
    try {
      await onDeleteRemoteBranch(remoteName, branchName)
      setContextMenu(null)
      setShowDeleteConfirm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to delete remote branch')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCheckout = async () => {
    if (!onCheckoutRemoteBranch) return
    try {
      await onCheckoutRemoteBranch(remoteName, branchName)
      setContextMenu(null)
    } catch (err: any) {
      setError(err.message || 'Failed to checkout branch')
    }
  }

  return (
    <div>
      <button
        onClick={() => onBranchSelect(tip)}
        onContextMenu={handleContextMenu}
        className="flex w-full items-center gap-1 py-0.5 pl-8 pr-2 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
      >
        <Icon name="branch" size={12} className="text-neutral-400 dark:text-neutral-500" />
        <span className="truncate">{branchName}</span>
      </button>

      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-50 cursor-default rounded-md border border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 ${
            showDeleteConfirm ? 'w-64 p-3' : 'min-w-[160px] py-1 shadow-md'
          }`}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Delete Remote Branch</h3>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                Are you sure you want to delete branch <span className="font-semibold text-neutral-900 dark:text-neutral-50">'{branchName}'</span> from <span className="font-semibold text-neutral-900 dark:text-neutral-50">'{remoteName}'</span>?
              </p>
              
              {error && (
                <div className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-900/50 dark:bg-red-900/20 mt-2">
                  <p className="text-[10px] text-red-600 dark:text-red-400 leading-tight">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  disabled={isDeleting}
                  onClick={() => {
                    setContextMenu(null)
                    setShowDeleteConfirm(false)
                  }}
                  className="rounded px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center justify-center gap-1.5 rounded bg-red-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting && (
                    <svg className="git-spinner h-2.5 w-2.5 text-white/90" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                  )}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              {onCheckoutRemoteBranch && (
                <button
                  onClick={handleCheckout}
                  className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  Checkout '{branchName}'
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center px-3 py-1.5 text-xs text-red-600 hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-700"
              >
                Delete '{branchName}' from '{remoteName}'
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}


// ── Stash tree item ─────────────────────────────────────────────

function StashItem({
  stash,
  onApply,
  onPop,
  onDrop,
}: {
  stash: GitStash
  onApply: (index: number) => Promise<void>
  onPop: (index: number) => Promise<void>
  onDrop: (index: number) => Promise<void>
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <div>
      <div
        onContextMenu={handleContextMenu}
        className="flex w-full items-center gap-1 py-0.5 pl-5 pr-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-default"
      >
        <Icon name="archive" size={12} className="text-neutral-400 dark:text-neutral-500" />
        <span className="truncate">{stash.message}</span>
      </div>

      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] py-1 cursor-default rounded-md border border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <button
            onClick={() => { onApply(stash.index); setContextMenu(null) }}
            className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          >
            Apply Stash
          </button>
          <button
            onClick={() => { onPop(stash.index); setContextMenu(null) }}
            className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          >
            Pop Stash
          </button>
          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-600" />
          <button
            onClick={() => { onDrop(stash.index); setContextMenu(null) }}
            className="flex w-full items-center px-3 py-1.5 text-xs text-red-600 hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-700"
          >
            Drop Stash
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────



export function LeftSidebar({
  activeBranch,
  branches,
  remotes,
  tags,
  stashes,
  submodules,
  localChangesCount,
  activeView,
  loading,
  onViewChange,
  onBranchSelect,
  onActiveBranchChange,
  onMerge,
  onRebase,
  onDelete,
  onPull,
  onPush,
  onRemoveTag,
  onDeleteRemoteBranch,
  onCheckoutRemoteBranch,
  onStashApply,
  onStashPop,
  onStashDrop,
  onTrackingSet,
  onTrackingUnset,
}: LeftSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-neutral-200 bg-neutral-25 dark:border-neutral-600 dark:bg-neutral-900">
      {/* High-level views */}
      <div className="shrink-0 border-b border-neutral-200 py-1 dark:border-neutral-600">
        <button
          onClick={() => onViewChange('localChanges')}
          className={`flex w-full items-center gap-2 px-2.5 py-1 text-xs ${
            activeView === 'localChanges'
              ? 'bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50'
              : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
          }`}
        >
          <span>Local Changes</span>
          {localChangesCount > 0 && (
            <span className="text-[0.625rem] text-neutral-400 dark:text-neutral-500">
              ({localChangesCount})
            </span>
          )}
        </button>
        <button
          onClick={() => onViewChange('history')}
          className={`flex w-full items-center gap-2 px-2.5 py-1 text-xs ${
            activeView === 'history'
              ? 'bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50'
              : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
          }`}
        >
          <span>History</span>
        </button>
      </div>

      {/* Ref tree */}
      <div className="flex-1 overflow-y-auto py-1">
        <TreeSection title="Branches">
          {loading && branches.length === 0 ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SidebarItemSkeleton key={i} />
              ))}
            </div>
          ) : branches.length > 0 ? (
            branches.map((branch) => (
              <BranchItem
                key={branch.name}
                branch={branch}
                fullName={branch.name}
                activeBranch={activeBranch}
                remotes={remotes}
                onBranchSelect={onBranchSelect}
                onActiveBranchChange={onActiveBranchChange}
                onMerge={onMerge}
                onRebase={onRebase}
                onDelete={onDelete}
                onPull={onPull}
                onPush={onPush}
                onTrackingSet={onTrackingSet}
                onTrackingUnset={onTrackingUnset}
              />
            ))
          ) : (
            <div className="px-5 py-1 text-[0.625rem] italic text-neutral-400">
              No branches
            </div>
          )}
        </TreeSection>

        <TreeSection title="Remotes">
          {loading && remotes.length === 0 ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <SidebarItemSkeleton key={i} />
              ))}
            </div>
          ) : remotes.length > 0 ? (
            remotes.map((remote) => (
              <div key={remote.name}>
                <div className="flex items-center gap-1 py-0.5 pl-5 pr-2 text-xs text-neutral-500 dark:text-neutral-300">
                  <Icon name="folder" size={12} className="text-neutral-400 dark:text-neutral-500" />
                  <span>{remote.name}</span>
                </div>
                {remote.branches.map((b) => (
                  <RemoteBranchItem
                    key={b.name}
                    remoteName={remote.name}
                    branchName={b.name}
                    tip={b.tip}
                    onBranchSelect={onBranchSelect}
                    onDeleteRemoteBranch={onDeleteRemoteBranch}
                    onCheckoutRemoteBranch={onCheckoutRemoteBranch}
                  />
                ))}
              </div>
            ))
          ) : (
            <div className="px-5 py-1 text-[0.625rem] italic text-neutral-400">
              No remotes
            </div>
          )}
        </TreeSection>

        <TreeSection title="Tags" defaultOpen={false}>
          {loading && tags.length === 0 ? (
            <div className="flex flex-col gap-1">
              <SidebarItemSkeleton />
            </div>
          ) : tags.length > 0 ? (
            tags.map((tag) => (
              <TagItem key={tag.name} tag={tag} onRemoveTag={onRemoveTag} />
            ))
          ) : (
            <div className="px-5 py-1 text-[0.625rem] italic text-neutral-400">
              No tags
            </div>
          )}
        </TreeSection>

        <TreeSection title="Stashes">
          {loading && stashes.length === 0 ? (
            <div className="flex flex-col gap-1">
              <SidebarItemSkeleton />
            </div>
          ) : stashes.length > 0 ? (
            stashes.map((s) => (
              <StashItem 
                key={s.index} 
                stash={s} 
                onApply={onStashApply} 
                onPop={onStashPop} 
                onDrop={onStashDrop} 
              />
            ))
          ) : (
            <div className="px-5 py-1 text-[0.625rem] italic text-neutral-400">
              No stashes
            </div>
          )}
        </TreeSection>

        <TreeSection title="Submodules" defaultOpen={false}>
          {loading && submodules.length === 0 ? (
            <div className="flex flex-col gap-1">
              <SidebarItemSkeleton />
            </div>
          ) : submodules.length > 0 ? (
            submodules.map((sub) => (
              <div
                key={sub.path}
                className="flex items-center gap-1 py-0.5 pl-5 pr-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <Icon name="folder" size={12} className="text-neutral-400 dark:text-neutral-500" />
                <span className="truncate">{sub.name}</span>
              </div>
            ))
          ) : (
            <div className="px-5 py-1 text-[0.625rem] italic text-neutral-400">
              None
            </div>
          )}
        </TreeSection>
      </div>
    </aside>
  )
}
