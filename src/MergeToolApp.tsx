import { useEffect, useState } from 'react'
import { ThemeProvider } from './hooks/useTheme'
import { useGitData } from './hooks/useGitData'
import { MergeConflictTool } from './components/merge/MergeConflictTool'
import { WindowFrame } from './components/ui/WindowFrame'
import { StatusEntry } from '../electron/shared/types'

function MergeToolLayout() {
  const urlParams = new URLSearchParams(window.location.search)
  const repoPath = urlParams.get('repoPath')
  
  const gitData = useGitData(repoPath)
  const [conflicts, setConflicts] = useState<StatusEntry[]>([])

  useEffect(() => {
    if (repoPath) {
      gitData.getConflicts().then(setConflicts)
    }
  }, [repoPath, gitData.getConflicts])

  const handleResolve = async (path: string, content: string) => {
    await gitData.resolveConflict(path, content)
    const updated = await gitData.getConflicts()
    setConflicts(updated)
    
    if (updated.length === 0) {
      // All resolved, close window
      window.close()
    }
  }

  if (!repoPath) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 text-sm">
        Invalid repository path.
      </div>
    )
  }

  return (
    <WindowFrame 
      title={`Conflicts - ${repoPath.split(/[\\/]/).pop()}`}
      onClose={() => window.close()}
      padding={false}
    >
      <MergeConflictTool
        isOpen={true}
        onClose={() => window.close()}
        conflicts={conflicts}
        getConflictDetails={gitData.getConflictDetails}
        resolveConflict={handleResolve}
        standalone={true}
      />
    </WindowFrame>
  )
}

export default function MergeToolApp() {
  return (
    <ThemeProvider>
      <MergeToolLayout />
    </ThemeProvider>
  )
}
