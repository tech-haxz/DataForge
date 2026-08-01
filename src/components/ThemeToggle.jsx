import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
export default function ThemeToggle() { const { theme, setTheme } = useTheme(); return <div className="flex items-center rounded-full border border-line bg-panel p-1" aria-label="Theme selector">{[['light',Sun],['dark',Moon],['auto',Monitor]].map(([id, Icon]) => <button key={id} onClick={() => setTheme(id)} className={`rounded-full p-1.5 ${theme === id ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'}`} aria-label={`${id} theme`}><Icon size={14}/></button>)}</div> }
