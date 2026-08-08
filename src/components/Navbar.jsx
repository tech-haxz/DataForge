import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LayoutDashboard, LogOut, Menu, Shield, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/Opendoc-logo1.png'


const links = [['What we do', '/'], ['Services', '/projects'], ['Courses', '/courses'], ['Mentorship', '/mentorship']]

export default function Navbar({ menuOpen, setMenuOpen }) {
  const { user, isStaff, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  const navClass = ({ isActive }) => `transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`

  return <header className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
    <div className="container flex h-[72px] items-center justify-between">
      <Link to="/" className="flex items-center" onClick={() => setMenuOpen(false)} aria-label="OpenDoc home">
        <img src={logo} alt="OpenDoc.in" className="h-14 w-auto max-w-[170px] object-contain" />
        <h1 className="ml-2 text-2xl font-bold text-ink">Open<span className="text-primary text-[#1689EA]">Doc.</span>in</h1>
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
        {links.map(([label, to]) => <NavLink key={label} to={to} className={navClass}>{label}</NavLink>)}
        {user && <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>}
        {isStaff && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        <ThemeToggle />
        {user
          ? <>
            <span className="max-w-[140px] truncate text-sm text-muted">{user.name}</span>
            <button className="btn-ghost px-3 py-2 text-sm" onClick={signOut} title="Sign out"><LogOut size={16} /></button>
          </>
          : <>
            <Link to="/login" className="btn-ghost px-3 py-2 text-sm">Sign in</Link>
            <Link to="/signup" className="btn-primary px-4 py-2 text-sm">Join the next cohort <ArrowUpRight size={15} /></Link>
          </>}
      </div>

      <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
    </div>

    {menuOpen && <div className="container border-t border-line py-5 md:hidden">
      <nav className="flex flex-col gap-5 text-sm">
        {links.map(([label, to]) => <NavLink key={label} to={to} onClick={() => setMenuOpen(false)} className="text-muted">{label}</NavLink>)}
        {user && <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-muted"><LayoutDashboard size={15} /> Dashboard</NavLink>}
        {isStaff && <NavLink to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-muted"><Shield size={15} /> Admin panel</NavLink>}
        <div className="flex items-center justify-between gap-3 pt-2">
          <ThemeToggle />
          {user
            ? <button className="btn-ghost border border-line px-4 py-2 text-sm" onClick={signOut}>Sign out <LogOut size={15} /></button>
            : <div className="flex gap-2">
              <Link to="/login" className="btn-ghost border border-line px-4 py-2 text-sm" onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link to="/signup" className="btn-primary px-4 py-2 text-sm" onClick={() => setMenuOpen(false)}>Join <ArrowUpRight size={15} /></Link>
            </div>}
        </div>
      </nav>
    </div>}
  </header>
}
