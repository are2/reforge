import { useTheme, ThemeProvider } from './hooks/useTheme'
import { Icon } from './components/ui/Icon'
import { WindowFrame } from './components/ui/WindowFrame'

function SettingsLayout() {
  const { theme } = useTheme()

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
      <div className="space-y-8">
        <header>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure your experience in Reforge.
          </p>
        </header>

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
