import { useState, useEffect, useRef } from 'react'
import type { GitError } from '../../hooks/useGitData'
import { Icon } from '../ui/Icon'
import { StashFlyover } from '../stash/StashFlyover'

interface ToolbarButton {
  icon: string
  label: string
  onClick?: () => void
  disabled?: boolean
}

function ToolbarBtn({ icon, label, onClick, disabled }: ToolbarButton) {
  return (
    <button 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-testid={`toolbar-btn-${label}`}
      className="flex flex-col items-center gap-0.5 rounded-sm px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
    >

      <Icon name={icon} size={14} />
      <span className="text-[0.625rem] leading-none" data-testid={`toolbar-btn-label-${label}`}>{label}</span>
    </button>

  )
}

interface ActionToolbarProps {
  activeBranch: string
  repoName: string
  busy?: boolean
  errors?: GitError[]
  onClearErrors?: () => void
  onOpen?: () => void
  onFetch?: () => void
  onPush?: (branch: string, force: boolean) => Promise<void>
  onPull?: (branch: string, rebase: boolean) => Promise<void>
  onCreateBranch?: (name: string) => Promise<void>
  onClone?: (url: string, parentPath: string, name: string) => Promise<void>
  onOpenPullRequest?: () => void
  onStashPush?: (message?: string, includeUntracked?: boolean) => Promise<void>
  isPrSupported?: boolean
  branches?: string[]
}

export function ActionToolbar({
  activeBranch,
  repoName,
  busy = false,
  errors = [],
  onClearErrors,
  onOpen,
  onFetch,
  onPush,
  onPull,
  onCreateBranch,
  onClone,
  onOpenPullRequest,
  onStashPush,
  isPrSupported = false,
  branches = [],
}: ActionToolbarProps) {
  // Track visibility with a delayed hide so the fade-out animation can play
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
 
  // Error flyover state
  const [showErrors, setShowErrors] = useState(false)
  const errorsRef = useRef<HTMLDivElement>(null)
 
  // Branch flyover state
  const [showBranchForm, setShowBranchForm] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)
  const branchFormRef = useRef<HTMLDivElement>(null)
  const branchInputRef = useRef<HTMLInputElement>(null)
 
  // Push flyover state
  const [showPushForm, setShowPushForm] = useState(false)
  const [pushBranch, setPushBranch] = useState(activeBranch)
  const [forcePush, setForcePush] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [isPushing, setIsPushing] = useState(false)
  const pushFormRef = useRef<HTMLDivElement>(null)
 
  // Pull flyover state
  const [showPullForm, setShowPullForm] = useState(false)
  const [pullBranch, setPullBranch] = useState(activeBranch)
  const [rebase, setRebase] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)
  const [isPulling, setIsPulling] = useState(false)
  const pullFormRef = useRef<HTMLDivElement>(null)
 
  // Clone flyover state
  const [showCloneForm, setShowCloneForm] = useState(false)
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneParentPath, setCloneParentPath] = useState('')
  const [cloneRepoName, setCloneRepoName] = useState('')
  const [isCloning, setIsCloning] = useState(false)
  const cloneFormRef = useRef<HTMLDivElement>(null)
  const cloneUrlInputRef = useRef<HTMLInputElement>(null)
 
  // Stash flyover state
  const [showStashForm, setShowStashForm] = useState(false)
  const [isStashing, setIsStashing] = useState(false)
  const stashFormRef = useRef<HTMLDivElement>(null)

  const isValidBranchName = (() => {
    const name = newBranchName.trim()
    if (!name) return false
    // Basic git branch name validation: no spaces, no special chars like ~, ^, :, ?, *, [, \, etc.
    const forbiddenChars = /[ ~^:?*[\\]/
    if (forbiddenChars.test(name)) return false
    if (name.startsWith('.') || name.endsWith('.') || name.includes('..') || name.includes('//@')) return false
    if (name.endsWith('.lock')) return false
    return true
  })()

  const handleCreateBranch = async () => {
    if (!isValidBranchName || !onCreateBranch) return
    setIsCreatingBranch(true)
    try {
      await onCreateBranch(newBranchName.trim())
      setShowBranchForm(false)
    } finally {
      setIsCreatingBranch(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (errorsRef.current && !errorsRef.current.contains(e.target as Node)) {
        setShowErrors(false)
      }
    }
    if (showErrors) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showErrors])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchFormRef.current && !branchFormRef.current.contains(e.target as Node)) {
        setShowBranchForm(false)
      }
    }
    if (showBranchForm) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBranchForm])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pushFormRef.current && !pushFormRef.current.contains(e.target as Node)) {
        setShowPushForm(false)
      }
    }
    if (showPushForm) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPushForm])
 
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pullFormRef.current && !pullFormRef.current.contains(e.target as Node)) {
        setShowPullForm(false)
      }
    }
    if (showPullForm) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPullForm])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cloneFormRef.current && !cloneFormRef.current.contains(e.target as Node)) {
        setShowCloneForm(false)
      }
    }
    if (showCloneForm) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCloneForm])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (stashFormRef.current && !stashFormRef.current.contains(e.target as Node)) {
        setShowStashForm(false)
      }
    }
    if (showStashForm) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStashForm])

  useEffect(() => {
    if (showPushForm) {
      setPushBranch(activeBranch)
      setForcePush(false)
      setPushError(null)
    }
  }, [showPushForm, activeBranch])
 
  useEffect(() => {
    if (showPullForm) {
      setPullBranch(activeBranch)
      setRebase(false)
      setPullError(null)
    }
  }, [showPullForm, activeBranch])

  useEffect(() => {
    if (showBranchForm) {
      setNewBranchName('')
      // Focus input on open
      setTimeout(() => branchInputRef.current?.focus(), 50)
    }
  }, [showBranchForm])

  useEffect(() => {
    if (showCloneForm) {
      setCloneUrl('')
      setCloneParentPath('')
      setCloneRepoName('')
      // Focus input on open
      setTimeout(() => cloneUrlInputRef.current?.focus(), 50)
    }
  }, [showCloneForm])

  useEffect(() => {
    // Try to extract repo name from URL
    if (cloneUrl) {
      try {
        const parts = cloneUrl.split('/')
        const lastPart = parts[parts.length - 1]
        if (lastPart) {
          const name = lastPart.replace(/\.git$/, '')
          setCloneRepoName(name)
        }
      } catch (e) {
        // ignore
      }
    }
  }, [cloneUrl])

  useEffect(() => {
    if (busy) {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
      setVisible(true)
    } else if (visible) {
      // Delay unmount so fadeOut animation plays
      hideTimer.current = setTimeout(() => setVisible(false), 200)
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [busy, visible])

  const handlePush = async () => {
    if (!onPush || !pushBranch) return
    setPushError(null)
    setIsPushing(true)
    try {
      await onPush(pushBranch, forcePush)
      setShowPushForm(false)
    } catch (err) {
      // Extract clean message if possible
      const rawMessage = err instanceof Error ? err.message : 'Push failed'
      const message = rawMessage.replace(/^(Error occurred in handler for|Error invoking remote method) '.*': Error: /, '').trim()
      setPushError(message)
    } finally {
      setIsPushing(false)
    }
  }

  const handlePull = async () => {
    if (!onPull || !pullBranch) return
    setPullError(null)
    setIsPulling(true)
    try {
      await onPull(pullBranch, rebase)
      setShowPullForm(false)
    } catch (err) {
      // Extract clean message if possible
      const rawMessage = err instanceof Error ? err.message : 'Pull failed'
      const message = rawMessage.replace(/^(Error occurred in handler for|Error invoking remote method) '.*': Error: /, '').trim()
      setPullError(message)
    } finally {
      setIsPulling(false)
    }
  }

  const handleClone = async () => {
    if (!onClone || !cloneUrl || !cloneParentPath || !cloneRepoName) return
    setIsCloning(true)
    try {
      await onClone(cloneUrl, cloneParentPath, cloneRepoName)
      setShowCloneForm(false)
    } finally {
      setIsCloning(false)
    }
  }

  const handleStashPush = async (message?: string, includeUntracked?: boolean) => {
    if (!onStashPush) return
    setIsStashing(true)
    try {
      await onStashPush(message, includeUntracked)
      setShowStashForm(false)
    } finally {
      setIsStashing(false)
    }
  }

  const handleBrowseParent = async () => {
    const selected = await window.system.selectFolder()
    if (selected) {
      setCloneParentPath(selected)
    }
  }

  const fileButtons: ToolbarButton[] = [
    { 
      icon: 'folder', 
      label: 'Open',
      onClick: onOpen,
    },
    { icon: 'copy', label: 'Clone', onClick: () => setShowCloneForm(!showCloneForm) },
  ]

  const gitButtons: ToolbarButton[] = [
    { icon: 'fetch', label: 'Fetch', onClick: onFetch },
    { icon: 'pull', label: 'Pull', onClick: () => setShowPullForm(!showPullForm) },
    { icon: 'push', label: 'Push', onClick: () => setShowPushForm(!showPushForm) },
    { icon: 'stash', label: 'Stash', onClick: () => setShowStashForm(!showStashForm) },
  ]

  return (
    <div 
      data-testid="action-toolbar"
      className="relative flex h-[2.625rem] shrink-0 items-center border-b border-neutral-200 bg-neutral-50 px-2.5 dark:border-neutral-600 dark:bg-neutral-900"
    >

      {/* Left cluster */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {fileButtons.map((btn) => (
            <ToolbarBtn key={btn.label} {...btn} />
          ))}
        </div>
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex items-center gap-0.5">
          {gitButtons.map((btn) => (
            <ToolbarBtn key={btn.label} {...btn} />
          ))}
        </div>
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex items-center gap-0.5">
          <ToolbarBtn 
            icon="branch" 
            label="Branch" 
            onClick={() => setShowBranchForm(!showBranchForm)}
          />
          <ToolbarBtn 
            icon="pull-request" 
            label="Pull Request" 
            onClick={onOpenPullRequest}
            disabled={!isPrSupported}
          />
        </div>
      </div>

      {showBranchForm && (
        <div 
          ref={branchFormRef}
          className="absolute left-2.5 top-full z-50 mt-1.5 w-64 rounded-md border border-neutral-200 bg-neutral-0 p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Create New Branch</h3>
          
          <div className="flex flex-col gap-3">
            <input
              ref={branchInputRef}
              type="text"
              placeholder="Branch name"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValidBranchName) {
                  handleCreateBranch()
                } else if (e.key === 'Escape') {
                  setShowBranchForm(false)
                }
              }}
              className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBranchForm(false)}
                className="rounded px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                disabled={!isValidBranchName || busy}
                onClick={handleCreateBranch}
                className="flex items-center justify-center gap-1.5 rounded bg-primary-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 min-w-[60px]"
              >
                {isCreatingBranch && (
                  <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                )}
                <span>Create</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPullForm && (
        <div 
          ref={pullFormRef}
          className={`absolute left-2.5 top-full z-50 mt-1.5 rounded-md border border-neutral-200 bg-neutral-0 p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 transition-all duration-200 ${
            pullError ? 'w-[28rem]' : 'w-64'
          }`}
        >
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Pull from Origin</h3>
          
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-medium">Branch to Pull</label>
              <select
                value={pullBranch}
                onChange={(e) => setPullBranch(e.target.value)}
                className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
              >
                {branches.length > 0 ? (
                  branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                ) : (
                  <option value={activeBranch}>{activeBranch}</option>
                )}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rebase}
                onChange={(e) => setRebase(e.target.checked)}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300">Rebase instead of merge</span>
            </label>
            
            {pullError && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-[10px] leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                <div className="flex gap-1.5">
                  <Icon name="alert" size={12} className="shrink-0 mt-0.5" />
                  <span>{pullError}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowPullForm(false)}
                className="rounded px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={handlePull}
                className="flex items-center justify-center gap-1.5 rounded bg-primary-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 min-w-[50px]"
              >
                {isPulling && (
                  <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                )}
                <span>Pull</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPushForm && (
        <div 
          ref={pushFormRef}
          className={`absolute left-2.5 top-full z-50 mt-1.5 rounded-md border border-neutral-200 bg-neutral-0 p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 transition-all duration-200 ${
            pushError ? 'w-[28rem]' : 'w-64'
          }`}
        >
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Push to Origin</h3>
          
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-medium">Branch to Push</label>
              <select
                value={pushBranch}
                onChange={(e) => setPushBranch(e.target.value)}
                className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
              >
                {branches.length > 0 ? (
                  branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                ) : (
                  <option value={activeBranch}>{activeBranch}</option>
                )}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forcePush}
                onChange={(e) => setForcePush(e.target.checked)}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300">Force push</span>
            </label>
            
            {pushError && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-[10px] leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                <div className="flex gap-1.5">
                  <Icon name="alert" size={12} className="shrink-0 mt-0.5" />
                  <span>{pushError}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowPushForm(false)}
                className="rounded px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={handlePush}
                className="flex items-center justify-center gap-1.5 rounded bg-primary-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 min-w-[50px]"
              >
                {isPushing && (
                  <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                )}
                <span>Push</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloneForm && (
        <div 
          ref={cloneFormRef}
          className="absolute left-2.5 top-full z-50 mt-1.5 w-[28rem] rounded-md border border-neutral-200 bg-neutral-0 p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Clone</h2>
            <p className="text-[11px] text-neutral-500">Clone a remote repository into a local folder</p>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* Repo URL */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Repository Url:</label>
              <div className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Icon name="link" size={12} />
                </div>
                <input
                  ref={cloneUrlInputRef}
                  type="text"
                  placeholder="Git Repository Url"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full rounded border border-neutral-200 bg-neutral-50 py-1.5 pl-7 pr-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                />
              </div>
              <div className="col-start-2">
                <button className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                  Test Connection
                </button>
              </div>
            </div>

            {/* Parent Folder */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Parent Folder:</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="C:\Source\"
                  value={cloneParentPath}
                  onChange={(e) => setCloneParentPath(e.target.value)}
                  className="flex-1 rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                />
                <button 
                  onClick={handleBrowseParent}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-700"
                >
                  <Icon name="folder" size={14} />
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-right">Name:</label>
              <input
                type="text"
                placeholder="Repository name"
                value={cloneRepoName}
                onChange={(e) => setCloneRepoName(e.target.value)}
                className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-2">
              <button
                disabled={!cloneUrl || !cloneParentPath || !cloneRepoName || busy}
                onClick={handleClone}
                className="flex items-center justify-center gap-1.5 rounded bg-neutral-100/50 px-4 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-100 dark:bg-neutral-700/50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 min-w-[70px]"
              >
                {isCloning && (
                  <svg className="git-spinner h-3 w-3 text-neutral-400 dark:text-neutral-500" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                )}
                <span>Clone</span>
              </button>
              <button
                onClick={() => setShowCloneForm(false)}
                className="rounded border border-neutral-200 bg-neutral-0 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showStashForm && (
        <div 
          ref={stashFormRef}
          className="absolute left-2.5 top-full z-50 mt-1.5 w-[22rem] rounded-md border border-neutral-200 bg-neutral-0 p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
        >
          <StashFlyover 
            onSave={handleStashPush} 
            onCancel={() => setShowStashForm(false)}
            busy={isStashing}
          />
        </div>
      )}

      {/* Center – active branch pill */}
      {repoName && (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          <div className="flex items-center gap-2 rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-1 dark:border-neutral-600 dark:bg-neutral-800">
            <span className="text-[0.6875rem] font-medium text-neutral-900 dark:text-neutral-50">
              {repoName}
            </span>
            <span className="text-neutral-300 dark:text-neutral-500">|</span>
            <span className="flex items-center gap-1 text-[0.6875rem] text-neutral-500 dark:text-neutral-300">
              <Icon name="branch" size={12} />
              {activeBranch || 'no branch'}
            </span>
          </div>
        </div>
      )}

      {/* Right side – Errors & activity spinner */}
      <div className="ml-auto flex items-center gap-2 pr-1" ref={errorsRef}>
        {errors.length > 0 && (
          <div className="relative flex items-center">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className={`flex items-center gap-1.5 rounded bg-red-50/80 px-2 py-1 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors ${
                showErrors ? 'ring-2 ring-red-500/50' : ''
              }`}
              title="View Git Errors"
            >
              <Icon name="alert" size={12} />
              <span className="text-[10px] font-medium leading-none">
                Errors ({errors.length})
              </span>
            </button>

            {showErrors && (
              <div className="absolute right-0 top-full mt-2 flex max-h-96 w-[22rem] max-w-[calc(100vw-2rem)] flex-col rounded-md border border-neutral-200 bg-neutral-0 shadow-lg z-50 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-700">
                  <h3 className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-50">Git Errors</h3>
                  {onClearErrors && (
                    <button
                      onClick={() => { onClearErrors(); setShowErrors(false) }}
                      className="text-[10px] text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="flex flex-col gap-2">
                    {errors.map((err) => (
                      <div key={err.id} className="rounded border border-red-100 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                        <div className="mb-1 text-[10px] opacity-70">
                          {new Date(err.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{err.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {visible && (
          <div className={`flex items-center gap-1.5 ${busy ? 'git-activity-enter' : 'git-activity-exit'}`}>
            <svg
              className="git-spinner h-3.5 w-3.5 text-primary-500"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8" cy="8" r="6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="10"
                opacity="0.9"
              />
            </svg>
            <span className="text-[0.625rem] text-neutral-400 dark:text-neutral-500">
              Working…
            </span>
          </div>
        )}
      </div>

    </div>
  )
}
