import { useState, useCallback, useEffect } from 'react'
import type { WorkspaceTab, WorkspaceState } from '../../electron/shared/types'

let nextId = 1

function makeTab(repoPath: string): WorkspaceTab {
  const id = String(nextId++)
  // Extract the last directory name as the label
  const parts = repoPath.replace(/\\/g, '/').split('/')
  const label = parts.filter(Boolean).pop() || repoPath
  return { id, repoPath, label }
}

export function useWorkspaceTabs() {
  const [state, setState] = useState<WorkspaceState>({
    tabs: [],
    activeTabId: null,
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial workspace state
  useEffect(() => {
    window.system.getWorkspaceState().then((saved) => {
      if (saved && saved.tabs && Array.isArray(saved.tabs)) {
        setState(saved)
        // Ensure new tabs don't clash with loaded IDs
        const maxId = saved.tabs.reduce((max, t) => {
          const num = parseInt(t.id, 10)
          return !isNaN(num) && num > max ? num : max
        }, 0)
        if (maxId >= nextId) {
          nextId = maxId + 1
        }
      }
      setIsLoaded(true)
    })
  }, [])

  // Save workspace state when it changes
  useEffect(() => {
    if (isLoaded) {
      window.system.saveWorkspaceState(state)
    }
  }, [state, isLoaded])

  /** Open a repo in a new tab, or focus an existing tab if the path is already open. */
  const openTab = useCallback((repoPath: string) => {
    setState((prev) => {
      // Normalise for comparison
      const normalised = repoPath.replace(/\\/g, '/')
      const existing = prev.tabs.find(
        (t) => t.repoPath.replace(/\\/g, '/') === normalised,
      )
      if (existing) {
        return { ...prev, activeTabId: existing.id }
      }

      const tab = makeTab(repoPath)
      return {
        tabs: [...prev.tabs, tab],
        activeTabId: tab.id,
      }
    })
  }, [])

  /** Close a tab by ID. Auto-selects the nearest sibling. */
  const closeTab = useCallback((id: string) => {
    setState((prev) => {
      const idx = prev.tabs.findIndex((t) => t.id === id)
      if (idx === -1) return prev

      const next = prev.tabs.filter((t) => t.id !== id)
      let nextActive = prev.activeTabId

      if (prev.activeTabId === id) {
        if (next.length === 0) {
          nextActive = null
        } else if (idx >= next.length) {
          nextActive = next[next.length - 1].id
        } else {
          nextActive = next[idx].id
        }
      }

      return { tabs: next, activeTabId: nextActive }
    })
  }, [])

  /** Switch to a tab by ID. */
  const selectTab = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeTabId: id }))
  }, [])

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) ?? null

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab,
    openTab,
    closeTab,
    selectTab,
    historyPaneHeight: state.historyPaneHeight ?? 400,
    setHistoryPaneHeight: (height: number | ((prev: number) => number)) => {
      setState((prev) => {
        const nextHeight = typeof height === 'function' ? height(prev.historyPaneHeight ?? 400) : height
        return { ...prev, historyPaneHeight: nextHeight }
      })
    },
    sidebarWidth: state.sidebarWidth ?? 260,
    setSidebarWidth: (width: number | ((prev: number) => number)) => {
      setState((prev) => {
        const nextWidth = typeof width === 'function' ? width(prev.sidebarWidth ?? 260) : width
        return { ...prev, sidebarWidth: nextWidth }
      })
    },
  }
}
