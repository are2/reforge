import { useState, useCallback, useEffect, useRef } from 'react'
import { ThemeProvider } from './hooks/useTheme'
import { useGitData } from './hooks/useGitData'
import { useWorkspaceTabs } from './hooks/useWorkspaceTabs'
import { ActionToolbar } from './components/layout/ActionToolbar'
import { WorkspaceTabStrip } from './components/layout/WorkspaceTabStrip'
import { LeftSidebar } from './components/layout/LeftSidebar'
import { HistoryPane } from './components/layout/HistoryPane'
import { DetailsPane } from './components/layout/DetailsPane'
import { LocalChangesPane } from './components/layout/LocalChangesPane'
import { Resizer } from './components/layout/Resizer'
import { ConflictDialog } from './components/merge/ConflictDialog'
import { TitleBar } from './components/layout/TitleBar'

type ActiveView = 'history' | 'localChanges'

function AppLayout() {
  const { 
    tabs, 
    activeTabId, 
    activeTab, 
    openTab, 
    closeTab, 
    selectTab,
    historyPaneHeight,
    setHistoryPaneHeight,
    sidebarWidth,
    setSidebarWidth
  } = useWorkspaceTabs()
  const gitData = useGitData(activeTab?.repoPath ?? null)

  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>('history')

  // Conflict UI state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [lastConflictError, setLastConflictError] = useState<string | undefined>()

  // Refresh when window regains focus to catch changes from external tools/windows
  useEffect(() => {
    const onFocus = () => {
      gitData.refresh(true)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [gitData.refresh])

  const handleViewChange = useCallback((view: ActiveView) => {
    setActiveView(view)
    if (view === 'localChanges') {
      gitData.loadLocalChanges()
    }
  }, [gitData.loadLocalChanges])

  const handleSelect = useCallback((hash: string) => {
    setSelectedHash(hash)
    gitData.loadCommitDetail(hash)
  }, [gitData.loadCommitDetail])

  const handleActiveBranchChange = useCallback((name: string) => {
    gitData.checkoutBranch(name)
  }, [gitData.checkoutBranch])

  /** Wrap commit to switch view back to history on success. */
  const handleCommit = useCallback(async (message: string, amend?: boolean) => {
    await gitData.commit(message, amend)
    setActiveView('history')
  }, [gitData.commit])

  /** Open button: pick a folder and create a tab for it. */
  const handleOpen = useCallback(async () => {
    const selected = await window.system.selectFolder()
    if (selected) {
      openTab(selected)
    }
  }, [openTab])

  /** Clone button: open clone flyover and handle the action. */
  const handleClone = useCallback(async (url: string, parentPath: string, name: string) => {
    try {
      await window.git.clone(url, parentPath, name)
      // Successfully cloned, now open it
      // Use a simple path join that works for both windows/unix as long as we normalize later
      const fullPath = parentPath.endsWith('/') || parentPath.endsWith('\\') 
        ? `${parentPath}${name}` 
        : `${parentPath}/${name}`
      openTab(fullPath)
    } catch (err) {
      // Error is handled by useGitData via state.errors if we were to move clone there,
      // but for now let's just let it bubble or handle it here if we had a toast system.
      // Since it's a promise, the catch block in useGitData's other methods is a good pattern.
      // For now, I'll just re-throw or log it.
      console.error('Clone failed:', err)
      throw err // ActionToolbar can catch this if it wants to show local error
    }
  }, [openTab])

  const handleCommitSelectFile = useCallback((filePath: string, revision: string) => {
    gitData.loadFileDiff(filePath, false, false, revision)
  }, [gitData.loadFileDiff])

  // When repo finishes loading and we have commits, select the first one
  const prevCommitsRef = useState<string | null>(null)
  if (gitData.commits.length > 0 && selectedHash === null) {
    // Auto-select first commit after load
    const firstHash = gitData.commits[0].hash
    if (prevCommitsRef[0] !== firstHash) {
      prevCommitsRef[1](firstHash)
      // Use setTimeout to avoid setting state during render
      setTimeout(() => {
        setSelectedHash(firstHash)
        gitData.loadCommitDetail(firstHash)
      }, 0)
    }
  }

  // Reset selected hash when the active tab changes
  const prevTabIdRef = useState<string | null>(null)
  if (activeTabId !== prevTabIdRef[0]) {
    prevTabIdRef[1](activeTabId)
    if (selectedHash !== null) {
      // Use setTimeout to avoid setting state during render
      setTimeout(() => setSelectedHash(null), 0)
    }
  }

  // Reload local changes when switching tabs if the view is active
  useEffect(() => {
    if (activeView === 'localChanges' && activeTab?.repoPath) {
      gitData.loadLocalChanges()
    }
  }, [activeView, activeTab?.repoPath, gitData.loadLocalChanges])

  // Switch to history view when the active tab actually changes
  const prevTabIdForViewRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeTabId && activeTabId !== prevTabIdForViewRef.current) {
      prevTabIdForViewRef.current = activeTabId
      setActiveView('history')
    }
  }, [activeTabId])

  const handleResolveConflicts = useCallback(() => {
    if (!activeTab?.repoPath) return
    window.git.openMergeTool(activeTab.repoPath)
    setConflictDialogOpen(false)
  }, [activeTab?.repoPath])

  const handleMerge = useCallback(async (branch: string) => {
    try {
      await gitData.merge(branch)
    } catch (err: any) {
      if (err.message.toLowerCase().includes('conflict')) {
        setLastConflictError(err.message)
        setConflictDialogOpen(true)
      }
    }
  }, [gitData.merge])

  const handleCherryPick = useCallback(async (hash: string) => {
    try {
      await gitData.cherryPick(hash)
    } catch (err: any) {
      if (err.message.toLowerCase().includes('conflict')) {
        setLastConflictError(err.message)
        setConflictDialogOpen(true)
      }
    }
  }, [gitData.cherryPick])

  const handleRebase = useCallback(async (branch: string) => {
    try {
      await gitData.rebase(branch)
    } catch (err: any) {
      if (err.message.toLowerCase().includes('conflict')) {
        setLastConflictError(err.message)
        setConflictDialogOpen(true)
      }
    }
  }, [gitData.rebase])

  const handlePull = useCallback(async (branch: string, rebase: boolean) => {
    try {
      await gitData.pull(branch, rebase)
    } catch (err: any) {
      if (err.message.toLowerCase().includes('conflict')) {
        setLastConflictError(err.message)
        setConflictDialogOpen(true)
      }
    }
  }, [gitData.pull])

  const flattenedBranches = (() => {
    const names: string[] = []
    function walk(items: any[], prefix = '') {
      for (const item of items) {
        const fullName = prefix ? `${prefix}/${item.name}` : item.name
        if (item.children) {
          walk(item.children, fullName)
        } else {
          names.push(fullName)
        }
      }
    }
    walk(gitData.branches)
    return names
  })()

  return (
    <div className="flex h-screen flex-col bg-neutral-25 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <TitleBar />

      {/* Action toolbar */}
      <ActionToolbar
        activeBranch={gitData.currentBranch}
        repoName={gitData.repoName}
        busy={gitData.loading || gitData.detailLoading}
        errors={gitData.errors}
        onClearErrors={gitData.clearErrors}
        onOpen={handleOpen}
        onFetch={gitData.fetch}
        onPush={gitData.push}
        onPull={handlePull}
        onCreateBranch={gitData.createBranch}
        onClone={handleClone}
        onOpenPullRequest={gitData.openPullRequest}
        onStashPush={gitData.stashPush}
        isPrSupported={gitData.isPrSupported}
        branches={flattenedBranches}
      />

      {/* Workspace tab strip */}
      <WorkspaceTabStrip
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={selectTab}
        onClose={closeTab}
      />

      {/* Main workspace: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <div 
          className="hidden shrink-0 md:block"
          style={{ width: sidebarWidth }}
        >
          <LeftSidebar
            activeBranch={gitData.currentBranch}
            branches={gitData.branches}
            remotes={gitData.remotes}
            tags={gitData.tags}
            stashes={gitData.stashes}
            submodules={gitData.submodules}
            localChangesCount={gitData.localChangesCount}
            activeView={activeView}
            loading={gitData.loading}
            onViewChange={handleViewChange}
            onBranchSelect={handleSelect}
             onActiveBranchChange={handleActiveBranchChange}
            onMerge={handleMerge}
            onRebase={handleRebase}
            onDelete={gitData.deleteBranch}
            onPull={handlePull}
            onPush={gitData.push}
            onRemoveTag={gitData.deleteTag}
            onDeleteRemoteBranch={gitData.deleteRemoteBranch}
            onStashApply={gitData.stashApply}
            onStashPop={gitData.stashPop}
            onStashDrop={gitData.stashDrop}
            onTrackingSet={gitData.setBranchUpstream}
            onTrackingUnset={gitData.unsetBranchUpstream}
          />
        </div>

        {/* Vertical Resizer */}
        <Resizer
          orientation="vertical"
          onResize={(delta) => setSidebarWidth(prev => Math.max(150, Math.min(600, prev + delta)))}
          className="z-10 -mx-0.5"
        />

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {activeView === 'localChanges' ? (
            <LocalChangesPane
              staged={gitData.localChanges?.staged ?? []}
              unstaged={gitData.localChanges?.unstaged ?? []}
              selectedDiff={gitData.selectedDiff}
              localChangesLoading={gitData.localChangesLoading}
              diffLoading={gitData.diffLoading}
              lastCommit={gitData.commits[0] ?? null}
              onSelectFile={gitData.loadFileDiff}
              onStageFile={gitData.stageFile}
              onUnstageFile={gitData.unstageFile}
              onDiscardFile={gitData.discardFile}
              onCommit={handleCommit}
            />
          ) : (
            <>
              {/* History pane */}
              <div 
                className="flex min-h-0 flex-col border-b border-neutral-200 bg-neutral-0 dark:border-neutral-600 dark:bg-neutral-900"
                style={{ height: historyPaneHeight }}
              >
                <HistoryPane 
            commits={gitData.commits} 
            selectedHash={selectedHash}
            onSelect={handleSelect}
            loading={gitData.loading}
            isMerging={!!gitData.isMerging}
            isRebasing={!!gitData.isRebasing}
            isCherryPicking={!!gitData.isCherryPicking}
            hasConflicts={
              (gitData.localChanges?.staged.some((s) => s.status === 'conflict') ||
              gitData.localChanges?.unstaged.some((s) => s.status === 'conflict')) ?? false
            }
            onResolveMerge={handleResolveConflicts}
            onAbortMerge={gitData.abortMerge}
            onContinueMerge={gitData.continueMerge}
            onCherryPick={handleCherryPick}
            onCreateTag={gitData.createTag}
            onRemoveTag={gitData.deleteTag}
          />
              </div>

              {/* Resizer */}
              <Resizer 
                onResize={(delta) => setHistoryPaneHeight(prev => Math.max(100, prev + delta))} 
                className="z-10 -my-0.5"
              />

              {/* Details pane – takes remaining space */}
              <div className="flex min-h-0 flex-1 flex-col bg-neutral-25 dark:bg-neutral-850">
                <DetailsPane
                  repoPath={activeTab?.repoPath ?? null}
                  selectedCommit={gitData.selectedCommit}
                  detailLoading={gitData.detailLoading}
                  selectedDiff={gitData.selectedDiff}
                  diffLoading={gitData.diffLoading}
                  onSelectFile={handleCommitSelectFile}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ConflictDialog
        isOpen={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        onResolve={handleResolveConflicts}
        error={lastConflictError}
      />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>
  )
}
