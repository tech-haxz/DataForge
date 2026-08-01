import { createContext, useContext, useEffect, useState } from 'react'
const ThemeContext = createContext()
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('codingmindset-theme') || 'auto')
  useEffect(() => { localStorage.setItem('codingmindset-theme', theme); const root = document.documentElement; const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches); root.classList.toggle('dark', dark) }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
