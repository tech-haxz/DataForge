import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Hero3D from './components/Hero3D'
import { ThemeProvider } from './context/ThemeContext'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Courses from './pages/Courses'
import Mentorship from './pages/Mentorship'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return <ThemeProvider><div className="min-h-screen bg-canvas text-ink transition-colors duration-300"><div className="site-background"><Hero3D /></div><div className="site-content"><Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} /><main><Routes><Route path="/" element={<Home />} /><Route path="/projects" element={<Projects />} /><Route path="/courses" element={<Courses />} /><Route path="/mentorship" element={<Mentorship />} /></Routes></main><Footer /></div></div></ThemeProvider>
}
