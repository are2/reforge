import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  GitRepoData,
  GitCommit,
  GitBranch,
  GitRemote,
  GitTag,
  GitStash,
  GitSubmodule,
  LocalChangesData,
  FileDiff,
} from '../../electron/shared/types'

export interface GitError {
  id: string
  message: string
  timestamp: number
}

interface GitDataState {
  /** Whether data is currently loading. */
  loading: boolean
  /** Errors that occurred during git operations. */
  errors: GitError[]

  /** Repository display name. */
  repoName: string
  /** Current checked-out branch. */
  currentBranch: string

  // Refs
  branches: GitBranch[]
  remotes: GitRemote[]
  tags: GitTag[]
  stashes: GitStash[]
  submodules: GitSubmodule[]

  // History
  commits: GitCommit[]
  localChangesCount: number

  // Selected commit detail
  selectedCommit: GitCommit | null
  detailLoading: boolean

  // Local changes
  localChanges: LocalChangesData | null
  selectedDiff: FileDiff | null
  localChangesLoading: boolean
  diffLoading: boolean
  isPrSupported?: boolean

  // Merge/Rebase state
  isMerging?: boolean
  isRebasing?: boolean
  isCherryPicking?: boolean
}

const INITIAL_STATE: GitDataState = {
  loading: false,
  errors: [],
  repoName: '',
  currentBranch: '',
  branches: [],
  remotes: [],
  tags: [],
  stashes: [],
  submodules: [],
  commits: [],
  localChangesCount: 0,
  selectedCommit: null,
  detailLoading: false,
  localChanges: null,
  selectedDiff: null,
  localChangesLoading: false,
  diffLoading: false,
  isPrSupported: false,
  isMerging: false,
  isRebasing: false,
  isCherryPicking: false,
}

/**
 * Hook that manages Git data for a single repository path.
 * When `repoPath` changes the repo is loaded automatically.
 */
export function useGitData(repoPath: string | null) {
  const [state, setState] = useState<GitDataState>(INITIAL_STATE)

  // Keep a ref so callbacks always see the latest repoPath without re-creating
  const repoPathRef = useRef(repoPath)
  repoPathRef.current = repoPath
 
  /**
   * Helper to centralize and clean up git error messages.
   */
  const handleError = useCallback((err: unknown, fallback: string, context?: string) => {
    const rawMessage = err instanceof Error ? err.message : fallback
    // Clean up Electron IPC boilerplate
    let message = rawMessage.replace(/^(Error occurred in handler for|Error invoking remote method) '.*': Error: /, '').trim()
    
    // Specifically handle the "unstaged changes" error during pull with rebase
    if (context === 'pull' && message.includes('You have unstaged changes') && message.includes('commit or stash')) {
      message = 'Pull failed: You have unstaged changes. Please commit or stash them before pulling with rebase.'
    }

    // Merge conflict error
    if ((context === 'merge' || context === 'pull') && message.toLowerCase().includes('conflict')) {
      // We don't necessarily want to show this as a standard error if we're going to show the Resolve dialog
    }

    console.error(`[GitError] ${context || 'generic'}:`, message, err)
    
    setState((prev) => ({
      ...prev,
      loading: false,
      detailLoading: false,
      localChangesLoading: false,
      diffLoading: false,
      errors: [...prev.errors, { id: crypto.randomUUID(), message, timestamp: Date.now() }],
    }))
  }, [])

  /**
   * Load the full repository data for the given path.
   */
  const loadRepo = useCallback(async (path: string, silent = false) => {
    if (!silent) {
      setState((prev) => ({ 
        ...INITIAL_STATE, 
        loading: true, 
        errors: prev.errors 
      }))
    }

    try {
      const data: GitRepoData = await window.git.getRepoData(path)
      setState((prev) => ({
        ...prev,
        loading: false,
        repoName: data.repoName,
        currentBranch: data.currentBranch,
        branches: data.refs.branches,
        remotes: data.refs.remotes,
        tags: data.refs.tags,
        stashes: data.refs.stashes,
        submodules: data.refs.submodules,
        commits: data.commits,
        localChangesCount: data.localChangesCount,
        isPrSupported: data.isPrSupported,
        isMerging: data.isMerging,
        isRebasing: data.isRebasing,
        isCherryPicking: data.isCherryPicking,
        selectedCommit: silent ? prev.selectedCommit : null,
      }))
    } catch (err) {
      handleError(err, 'Failed to load repository', 'loadRepo')
      throw err
    }
  }, [handleError])

  // Auto-load when repoPath changes
  useEffect(() => {
    if (repoPath) {
      loadRepo(repoPath)
    } else {
      setState(INITIAL_STATE)
    }
  }, [repoPath, loadRepo])

  /**
   * Load full detail for a single commit (files, body, etc.).
   */
  const loadCommitDetail = useCallback(async (hash: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, detailLoading: true, selectedDiff: null }))

    try {
      const commit = await window.git.getCommitDetail(currentPath, hash)
      setState((prev) => ({
        ...prev,
        detailLoading: false,
        selectedCommit: commit,
      }))
    } catch (err) {
      handleError(err, 'Failed to load commit detail', 'loadCommitDetail')
      throw err
    }
  }, [handleError])

  /**
   * Checkout a branch by name, then refresh all data.
   */
  const checkoutBranch = useCallback(async (branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.checkoutBranch(currentPath, branch)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Checkout failed', 'checkoutBranch')
      throw err
    }
  }, [loadRepo, handleError])

  /**
   * Checkout a remote branch as a local tracking branch.
   */
  const checkoutRemoteBranch = useCallback(async (remote: string, branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.checkoutRemoteBranch(currentPath, remote, branch)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Checkout failed', 'checkoutRemoteBranch')
      throw err
    }
  }, [loadRepo, handleError])

  /**
   * Fetch from remotes
   */
  const fetch = useCallback(async () => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.fetch(currentPath)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Fetch failed', 'fetch')
      throw err
    }
  }, [loadRepo, handleError])

  /**
   * Load local changes (staged + unstaged) from git status.
   */
  const loadLocalChanges = useCallback(async (silent = false) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    if (!silent) {
      setState((prev) => ({ ...prev, localChangesLoading: true }))
    }
    try {
      const data = await window.git.getLocalChanges(currentPath)
      setState((prev) => ({
        ...prev,
        localChangesLoading: false,
        localChanges: data,
        selectedDiff: silent ? prev.selectedDiff : null,
      }))
    } catch (err) {
      handleError(err, 'Failed to load local changes', 'loadLocalChanges')
    }
  }, [handleError])

  /**
   * Load the diff for a single file.
   */
  const loadFileDiff = useCallback(async (filePath: string, staged: boolean, amend?: boolean, revision?: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, diffLoading: true }))
    try {
      const diff = await window.git.getFileDiff(currentPath, filePath, staged, amend, revision)
      setState((prev) => ({ ...prev, selectedDiff: diff, diffLoading: false }))
    } catch (err) {
      handleError(err, 'Failed to load file diff', 'loadFileDiff')
    }
  }, [handleError])

  /**
   * Refresh all data for the current repository.
   */
  const refresh = useCallback(async (silent = false) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return
    await Promise.all([
      loadRepo(currentPath, silent),
      loadLocalChanges(silent)
    ])
  }, [loadRepo, loadLocalChanges])

  // Guard: only one stage/unstage operation at a time to prevent index.lock conflicts
  const stagingInFlight = useRef(false)

  /**
   * Stage a file and refresh local changes.
   */
  const stageFile = useCallback(async (filePath: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath || stagingInFlight.current) return
    stagingInFlight.current = true
    try {
      await window.git.stageFile(currentPath, filePath)
      await loadLocalChanges(true) // Silent reload
    } catch (err) {
      handleError(err, 'Failed to stage file', 'stageFile')
    } finally {
      stagingInFlight.current = false
    }
  }, [loadLocalChanges, handleError])

  /**
   * Unstage a file and refresh local changes.
   */
  const unstageFile = useCallback(async (filePath: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath || stagingInFlight.current) return
    stagingInFlight.current = true
    try {
      await window.git.unstageFile(currentPath, filePath)
      await loadLocalChanges(true) // Silent reload
    } catch (err) {
      handleError(err, 'Failed to unstage file', 'unstageFile')
    } finally {
      stagingInFlight.current = false
    }
  }, [loadLocalChanges, handleError])

  /**
   * Discard local changes in a file and refresh local changes.
   */
  const discardFile = useCallback(async (filePath: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath || stagingInFlight.current) return
    stagingInFlight.current = true
    try {
      await window.git.discardFile(currentPath, filePath)
      await loadLocalChanges(true) // Silent reload
    } catch (err) {
      handleError(err, 'Failed to discard changes', 'discardFile')
    } finally {
      stagingInFlight.current = false
    }
  }, [loadLocalChanges, handleError])

  /**
   * Commit staged files with the given message.
   */
  const commit = useCallback(async (message: string, amend?: boolean) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.commit(currentPath, message, amend)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Commit failed', 'commit')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, loadLocalChanges, handleError])

  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, errors: [] }))
  }, [])

  /**
   * Create a new branch, then refresh all data.
   */
  const createBranch = useCallback(async (branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.createBranch(currentPath, branch)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to create branch', 'createBranch')
    }
  }, [loadRepo, handleError])

  const push = useCallback(async (branch: string, force: boolean) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.push(currentPath, branch, force)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Push failed', 'push')
      throw err
    }
  }, [loadRepo, handleError])

  /**
   * Delete a local branch.
   */
  const deleteBranch = useCallback(async (branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.deleteBranch(currentPath, branch)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to delete branch', 'deleteBranch')
    }
  }, [loadRepo, handleError])

  /**
   * Pull changes from origin for the specified branch.
   */
  const pull = useCallback(async (branch: string, rebase: boolean) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.pull(currentPath, branch, rebase)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Pull failed', 'pull')
      await loadRepo(currentPath)
      await loadLocalChanges()
      throw err
    }
  }, [loadRepo, loadLocalChanges, handleError])
  
  /**
   * Merge a branch into the current one.
   */
  const merge = useCallback(async (branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.merge(currentPath, branch)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Merge failed', 'merge')
      // Refresh to get potential conflict state
      await loadRepo(currentPath)
      await loadLocalChanges()
      throw err
    }
  }, [loadRepo, loadLocalChanges, handleError])

  /**
   * Abort an ongoing merge, rebase, or cherry-pick.
   */
  const abortMerge = useCallback(async () => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      if (state.isRebasing) {
        await window.git.abortRebase(currentPath)
      } else if (state.isCherryPicking) {
        await window.git.abortCherryPick(currentPath)
      } else {
        await window.git.abortMerge(currentPath)
      }
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Failed to abort operation', 'abortMerge')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, loadLocalChanges, handleError, state.isRebasing, state.isCherryPicking])

  /**
   * Continue an ongoing merge, rebase, or cherry-pick.
   */
  const continueMerge = useCallback(async () => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      if (state.isRebasing) {
        await window.git.continueRebase(currentPath)
      } else if (state.isCherryPicking) {
        await window.git.continueCherryPick(currentPath)
      } else {
        await window.git.continueMerge(currentPath)
      }
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Failed to continue operation', 'continueMerge')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, loadLocalChanges, handleError, state.isRebasing, state.isCherryPicking])

  /**
   * Get files with conflicts.
   */
  const getConflicts = useCallback(async () => {
    const currentPath = repoPathRef.current
    if (!currentPath) return []
    return await window.git.getConflicts(currentPath)
  }, [])

  /**
   * Get side-by-side details for a conflicted file.
   */
  const getConflictDetails = useCallback(async (filePath: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) throw new Error('No repository open')
    return await window.git.getConflictDetails(currentPath, filePath)
  }, [])

  /**
   * Resolve a conflict.
   */
  const resolveConflict = useCallback(async (filePath: string, content: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.resolveConflict(currentPath, filePath, content)
      await loadLocalChanges()
      // Also refresh repo data to see if merge is complete
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to resolve conflict', 'resolveConflict')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadLocalChanges, loadRepo, handleError])

  /**
   * Rebase the current branch onto another branch.
   */
  const rebase = useCallback(async (branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.rebase(currentPath, branch)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Rebase failed', 'rebase')
      await loadRepo(currentPath)
      await loadLocalChanges()
      throw err
    }
  }, [loadRepo, loadLocalChanges, handleError])

  /**
   * Open the Pull Request creation page in the browser.
   */
  const openPullRequest = useCallback(async () => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.openPullRequest(currentPath, state.currentBranch)
    } catch (err) {
      handleError(err, 'Failed to open Pull Request', 'openPullRequest')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [state.currentBranch, handleError])

  /**
   * Create a new tag at a specific commit.
   */
  const createTag = useCallback(async (name: string, message: string, hash: string, push: boolean) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.createTag(currentPath, name, message, hash, push)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to create tag', 'createTag')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, handleError])

  /**
   * Delete a tag.
   */
  const deleteTag = useCallback(async (name: string, push: boolean) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.deleteTag(currentPath, name, push)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to delete tag', 'deleteTag')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, handleError])
  
  /**
   * Delete a remote branch.
   */
  const deleteRemoteBranch = useCallback(async (remote: string, branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.deleteRemoteBranch(currentPath, remote, branch)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to delete remote branch', 'deleteRemoteBranch')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, handleError])

  /**
   * Configure tracking reference (upstream) for a branch.
   */
  const setBranchUpstream = useCallback(async (branch: string, upstream: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.setBranchUpstream(currentPath, branch, upstream)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to set branch tracking', 'setBranchUpstream')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, handleError])

  /**
   * Remove tracking reference (upstream) from a branch.
   */
  const unsetBranchUpstream = useCallback(async (branch: string) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.unsetBranchUpstream(currentPath, branch)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to remove branch tracking', 'unsetBranchUpstream')
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, handleError])
  
  /**
   * Push local changes to a new stash.
   */
  const stashPush = useCallback(async (message?: string, includeUntracked?: boolean) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.stashPush(currentPath, message, includeUntracked)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Failed to save stash', 'stashPush')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, loadLocalChanges, handleError])

  /**
   * Pop a stash (apply and drop).
   */
  const stashPop = useCallback(async (index?: number) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.stashPop(currentPath, index)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Failed to pop stash', 'stashPop')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, loadLocalChanges, handleError])

  /**
   * Apply a stash.
   */
  const stashApply = useCallback(async (index?: number) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.stashApply(currentPath, index)
      await loadRepo(currentPath)
      await loadLocalChanges()
    } catch (err) {
      handleError(err, 'Failed to apply stash', 'stashApply')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, loadLocalChanges, handleError])

  /**
   * Drop a stash.
   */
  const stashDrop = useCallback(async (index?: number) => {
    const currentPath = repoPathRef.current
    if (!currentPath) return

    setState((prev) => ({ ...prev, loading: true }))
    try {
      await window.git.stashDrop(currentPath, index)
      await loadRepo(currentPath)
    } catch (err) {
      handleError(err, 'Failed to drop stash', 'stashDrop')
      throw err
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [loadRepo, handleError])


  return {
    ...state,
    loadCommitDetail,
    refresh,
    checkoutBranch,
    checkoutRemoteBranch,
    createBranch,
    fetch,
    loadLocalChanges,
    loadFileDiff,
    stageFile,
    unstageFile,
    discardFile,
    commit,
    clearErrors,
    push,
    pull,
    merge,
    abortMerge,
    continueMerge,
    rebase,
    deleteBranch,
    openPullRequest,
    getConflicts,
    getConflictDetails,
    resolveConflict,
    cherryPick: useCallback(async (hash: string) => {
      const currentPath = repoPathRef.current
      if (!currentPath) return

      setState((prev) => ({ ...prev, loading: true }))
      try {
        await window.git.cherryPick(currentPath, hash)
        await loadRepo(currentPath)
        await loadLocalChanges()
      } catch (err) {
        handleError(err, 'Cherry-pick failed', 'cherryPick')
        // Refresh to catch potential conflict state
        await loadRepo(currentPath)
        await loadLocalChanges()
        throw err
      } finally {
        setState((prev) => ({ ...prev, loading: false }))
      }
    }, [loadRepo, loadLocalChanges, handleError]),
    createTag,
    deleteTag,
    deleteRemoteBranch,
    setBranchUpstream,
    unsetBranchUpstream,
    stashPush,
    stashPop,
    stashApply,
    stashDrop,
  }
}
