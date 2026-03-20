import { useTheme } from '../../hooks/useTheme'
import { Icon } from '../ui/Icon'

const menuItems = ['File', 'View', 'Repository', 'Window', 'Help']

export function WindowChrome() {
  const { theme, toggle } = useTheme()

  return (
    <header className="flex h-7 select-none items-center justify-between border-b border-neutral-200 bg-neutral-50 px-2.5 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Menu labels */}
      <nav className="flex items-center gap-3">
        {menuItems.map((item) => (
          <button
            key={item}
            className="rounded-sm px-1 py-0.5 text-[0.6875rem] leading-tight text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={12} />
        </button>

        {/* Window controls (decorative) */}
        <div className="ml-2 flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>
      </div>
    </header>
  )
}
