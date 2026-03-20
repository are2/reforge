import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Initial theme fetch
    window.system.getTheme().then((t) => setTheme(t))

    // Listen for system theme updates (from menu)
    window.system.onThemeUpdate((t) => setTheme(t))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const toggle = useCallback(() => {
    // Toggling is now primarily handled by the system menu,
    // but we can keep this for local UI components if needed.
    // However, without a setTheme IPC, this only affects the current session
    // until the next system update or reload.
    // For now, let's keep it simple and align with system.
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
