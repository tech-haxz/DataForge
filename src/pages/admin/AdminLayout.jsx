import { NavLink, Outlet } from 'react-router-dom'
import { FolderKanban, LayoutDashboard, MessageSquare, PlaySquare, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  ['Overview', '/admin', LayoutDashboard, true],
  ['Courses', '/admin/courses', LayoutDashboard, false],
  ['Videos', '/admin/videos', PlaySquare, false],
  ['Users', '/admin/users', Users, false],
  ['Services', '/admin/projects', FolderKanban, false],
  ['Mentorship', '/admin/mentorship', MessageSquare, false]
]

export default function AdminLayout() {
  const { user } = useAuth()

  return <div className="container pb-24 pt-32">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <div className="eyebrow"><span className="dot" /> Admin panel</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Control room</h1>
      </div>
      <p className="text-sm text-muted">Signed in as <span className="font-semibold text-ink">{user.name}</span> · {user.role}</p>
    </div>

    <div className="mt-8 grid gap-8 lg:grid-cols-[210px_1fr] lg:items-start">
      <nav className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
        {links.map(([label, to, Icon, end]) => <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-lime text-[#061a35]' : 'text-muted hover:bg-panel hover:text-ink'}`}
        >
          <Icon size={16} /> {label}
        </NavLink>)}
      </nav>

      <div className="min-w-0"><Outlet /></div>
    </div>
  </div>
}
