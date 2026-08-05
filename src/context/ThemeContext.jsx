import { createContext, useContext, useEffect, useState } from 'react'
const ThemeContext = createContext()
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('codingmindset-theme') || 'auto')
  useEffect(() => {
    localStorage.setItem('codingmindset-theme', theme)
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => root.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && media.matches))
    const onPreferenceChange = () => { if (theme === 'auto') applyTheme() }
    applyTheme()
    media.addEventListener?.('change', onPreferenceChange)
    return () => media.removeEventListener?.('change', onPreferenceChange)
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
