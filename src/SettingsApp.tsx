import { useState, useEffect } from 'react'
import { useTheme, ThemeProvider } from './hooks/useTheme'
import { Icon } from './components/ui/Icon'
import { WindowFrame } from './components/ui/WindowFrame'

function SettingsLayout() {
  const { theme } = useTheme()

  const [gitVersions, setGitVersions] = useState<Array<{path: string, version: string}>>([])
  const [gitName, setGitName] = useState('')
  const [gitEmail, setGitEmail] = useState('')
  const [selectedGitPath, setSelectedGitPath] = useState('system')
  const [isSavingGit, setIsSavingGit] = useState(false)
  const [sortOrder, setSortOrder] = useState<'topo' | 'date'>('topo')
  const [verboseLogging, setVerboseLogging] = useState(false)
  const [showStashes, setShowStashes] = useState(false)
  const [mergeConflictHighlighting, setMergeConflictHighlighting] = useState(false)
  const [diffHighlighting, setDiffHighlighting] = useState(false)

  useEffect(() => {
    window.system.getGitPath().then(setSelectedGitPath)
    window.system.getCommitSortOrder().then(setSortOrder)
    window.system.getVerboseLogging().then(setVerboseLogging)
    window.system.getShowStashes().then(setShowStashes)
    window.system.getMergeConflictSyntaxHighlighting().then(setMergeConflictHighlighting)
    window.system.getDiffSyntaxHighlighting().then(setDiffHighlighting)
    window.git.getDetectedGitVersions().then(setGitVersions)
    window.git.getGlobalConfig().then(config => {
      setGitName(config.name || '')
      setGitEmail(config.email || '')
    })
  }, [])

  const handleSaveGit = async () => {
    setIsSavingGit(true)
    try {
      await window.git.setGlobalConfig(gitName, gitEmail)
    } finally {
      setIsSavingGit(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    window.system.setTheme(newTheme)
  }

  const footer = (
    <button 
      className="button secondary"
      onClick={() => window.close()}
    >
      Close
    </button>
  )

  return (
    <WindowFrame 
      title="Settings" 
      onClose={() => window.close()}
      footer={footer}
    >
      <div className="pb-6">
        <header>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure your experience in Reforge.
          </p>
        </header>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Appearance</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Dark Theme Option */}
            <div 
              className={`
                relative cursor-pointer rounded-lg border-2 p-4 transition-all
                ${theme === 'dark' 
                  ? 'border-accent-violet bg-accent-violet/5 ring-1 ring-accent-violet/20' 
                  : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-neutral-700'}
              `}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center shadow-sm">
                    <Icon name="moon" size={14} className="text-neutral-400" />
                  </div>
                  <span className="text-sm font-semibold">Dark Mode</span>
                </div>
                {theme === 'dark' && (
                  <div className="w-5 h-5 rounded-full bg-accent-violet flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-neutral-950" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 opacity-40">
                <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                <div className="h-1.5 w-2/3 bg-neutral-800 rounded-full" />
              </div>
            </div>

            {/* Light Theme Option */}
            <div 
              className={`
                relative cursor-pointer rounded-lg border-2 p-4 transition-all
                ${theme === 'light' 
                  ? 'border-accent-violet bg-accent-violet/5 ring-1 ring-accent-violet/20' 
                  : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-neutral-700'}
              `}
              onClick={() => handleThemeChange('light')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center shadow-sm">
                    <Icon name="sun" size={14} className="text-neutral-500" />
                  </div>
                  <span className="text-sm font-semibold">Light Mode</span>
                </div>
                {theme === 'light' && (
                  <div className="w-5 h-5 rounded-full bg-accent-violet flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-neutral-950" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 opacity-40">
                <div className="h-1.5 w-full bg-neutral-200 rounded-full" />
                <div className="h-1.5 w-2/3 bg-neutral-200 rounded-full" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Features</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-700 dark:text-neutral-300">
                  <input 
                    type="checkbox" 
                    checked={showStashes}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setShowStashes(enabled)
                      window.system.setShowStashes(enabled)
                    }}
                    className="w-4 h-4 rounded text-accent-violet bg-neutral-100 border-neutral-300 focus:ring-accent-violet dark:focus:ring-accent-violet dark:ring-offset-neutral-900 focus:ring-2 dark:bg-neutral-800 dark:border-neutral-600"
                  />
                  Show stashes in history graph
                </label>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-6 -mt-2">
                Include `refs/stash` and associated commits in the history view.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-700 dark:text-neutral-300">
                  <input 
                    type="checkbox" 
                    checked={mergeConflictHighlighting}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setMergeConflictHighlighting(enabled)
                      window.system.setMergeConflictSyntaxHighlighting(enabled)
                    }}
                    className="w-4 h-4 rounded text-accent-violet bg-neutral-100 border-neutral-300 focus:ring-accent-violet dark:focus:ring-accent-violet dark:ring-offset-neutral-900 focus:ring-2 dark:bg-neutral-800 dark:border-neutral-600"
                  />
                  Syntax highlighting in merge tool
                </label>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-6 -mt-2">
                Enable syntax highlighting in the merge conflict tool blocks.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-700 dark:text-neutral-300">
                  <input 
                    type="checkbox" 
                    checked={diffHighlighting}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setDiffHighlighting(enabled)
                      window.system.setDiffSyntaxHighlighting(enabled)
                    }}
                    className="w-4 h-4 rounded text-accent-violet bg-neutral-100 border-neutral-300 focus:ring-accent-violet dark:focus:ring-accent-violet dark:ring-offset-neutral-900 focus:ring-2 dark:bg-neutral-800 dark:border-neutral-600"
                  />
                  Syntax highlighting in diff view
                </label>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-6 -mt-2">
                Enable syntax highlighting in Local changes and Changes view diffs.
              </p>
            </div>
          </div>
        </section>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">History</h2>
          
          <div className="flex items-center gap-4">
            <h3 className="text-sm text-neutral-700 dark:text-neutral-300">Sort commits:</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input 
                  type="radio" 
                  name="sortOrder" 
                  value="topo" 
                  checked={sortOrder === 'topo'} 
                  onChange={(e) => {
                    const val = e.target.value as 'topo' | 'date'
                    setSortOrder(val)
                    window.system.setCommitSortOrder(val)
                  }}
                  className="w-4 h-4 text-accent-violet bg-neutral-100 border-neutral-300 focus:ring-accent-violet dark:focus:ring-accent-violet dark:ring-offset-neutral-900 focus:ring-2 dark:bg-neutral-800 dark:border-neutral-600"
                />
                Topologically
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input 
                  type="radio" 
                  name="sortOrder" 
                  value="date" 
                  checked={sortOrder === 'date'} 
                  onChange={(e) => {
                    const val = e.target.value as 'topo' | 'date'
                    setSortOrder(val)
                    window.system.setCommitSortOrder(val)
                  }}
                  className="w-4 h-4 text-accent-violet bg-neutral-100 border-neutral-300 focus:ring-accent-violet dark:focus:ring-accent-violet dark:ring-offset-neutral-900 focus:ring-2 dark:bg-neutral-800 dark:border-neutral-600"
                />
                By date
              </label>
            </div>
          </div>
        </section>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Git</h2>
          
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Detected Git Versions</h3>
            <div className="space-y-2">
              <select
                value={selectedGitPath}
                onChange={(e) => {
                  setSelectedGitPath(e.target.value)
                  window.system.setGitPath(e.target.value)
                }}
                className="w-full text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet"
              >
                <option value="system">System Default (git in PATH)</option>
                {gitVersions.map((gv) => (
                  <option key={gv.path} value={gv.path}>{gv.path} ({gv.version})</option>
                ))}
                <option value="integrated" disabled>Integrated Reforge Git (Coming soon)</option>
              </select>
              
              {gitVersions.length === 0 && (
                <div className="text-xs text-neutral-500 italic pt-1">Finding Git installations...</div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-6">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Global Git Configuration</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">Name</label>
                <input 
                  type="text" 
                  value={gitName}
                  onChange={(e) => setGitName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-sm bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">Email</label>
                <input 
                  type="text" 
                  value={gitEmail}
                  onChange={(e) => setGitEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full text-sm bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet"
                />
              </div>
              <div className="flex justify-start pt-2">
                <button
                  onClick={handleSaveGit}
                  disabled={isSavingGit}
                  className="button primary text-xs px-4 py-1.5"
                >
                  {isSavingGit ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-3 pt-6">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Debugging</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-700 dark:text-neutral-300">
                  <input 
                    type="checkbox" 
                    checked={verboseLogging}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setVerboseLogging(enabled)
                      window.system.setVerboseLogging(enabled)
                    }}
                    className="w-4 h-4 rounded text-accent-violet bg-neutral-100 border-neutral-300 focus:ring-accent-violet dark:focus:ring-accent-violet dark:ring-offset-neutral-900 focus:ring-2 dark:bg-neutral-800 dark:border-neutral-600"
                  />
                  Verbose git logging
                </label>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-6 -mt-2 flex items-center gap-2">
                Log every git command to a local file for troubleshooting.
                <button 
                  onClick={() => window.system.openGitLog()}
                  className="text-accent-violet hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1"
                >
                  Open git.log
                  <Icon name="link" size={10} />
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </WindowFrame>
  )
}

export default function SettingsApp() {
  return (
    <ThemeProvider>
      <SettingsLayout />
    </ThemeProvider>
  )
}
