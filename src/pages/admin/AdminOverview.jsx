import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, HardDrive, MessageSquare, PlaySquare, UserPlus, Users } from 'lucide-react'
import { api, formatBytes, formatDate } from '../../lib/api'
import { Alert, Spinner, StatusPill } from '../../components/ui'

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(err => setError(err.message))
  }, [])

  if (error) return <Alert>{error}</Alert>
  if (!stats) return <div className="flex items-center gap-2 text-muted"><Spinner /> Loading stats…</div>

  const { totals } = stats
  const cards = [
    ['Members', totals.users, Users, `${totals.students} students`],
    ['Courses', totals.courses, GraduationCap, `${totals.publishedCourses} published`],
    ['Lessons', totals.videos, PlaySquare, formatBytes(totals.storageBytes)],
    ['Enrollments', totals.enrollments, UserPlus, `${totals.projects} projects`],
    ['Open requests', totals.openRequests, MessageSquare, 'awaiting a reply'],
    ['Storage used', formatBytes(totals.storageBytes), HardDrive, 'video library']
  ]

  const peak = Math.max(1, ...stats.signupsLast14Days.map(d => d.n))

  return <div className="space-y-8">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value, Icon, hint]) => <div key={label} className="card p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-muted">{label}</span>
          <Icon size={16} className="text-lime" />
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>)}
    </div>

    <div className="card">
      <h2 className="font-semibold">Signups · last 14 days</h2>
      {stats.signupsLast14Days.length === 0
        ? <p className="mt-4 text-sm text-muted">No signups in this window yet.</p>
        : <div className="mt-6 flex h-36 items-stretch gap-2">
          {stats.signupsLast14Days.map(day => <div key={day.day} className="flex flex-1 flex-col justify-end gap-2" title={`${day.day}: ${day.n} signups`}>
            <span className="text-center text-[10px] font-semibold text-muted">{day.n}</span>
            <div className="w-full rounded-t bg-lime transition-all" style={{ height: `${(day.n / peak) * 100}%`, minHeight: 4 }} />
            <span className="text-center text-[10px] text-muted">{day.day.slice(5)}</span>
          </div>)}
        </div>}
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Most popular courses</h2>
          <Link to="/admin/courses" className="text-xs font-semibold text-lime">Manage</Link>
        </div>
        <ul className="mt-5 space-y-3 text-sm">
          {stats.topCourses.length === 0 && <li className="text-muted">No courses yet.</li>}
          {stats.topCourses.map(course => <li key={course.id} className="flex items-center justify-between gap-3">
            <span className="truncate">{course.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-muted"><StatusPill value={course.status} /> {course.students}</span>
          </li>)}
        </ul>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Newest members</h2>
          <Link to="/admin/users" className="text-xs font-semibold text-lime">Manage</Link>
        </div>
        <ul className="mt-5 space-y-3 text-sm">
          {stats.recentUsers.map(user => <li key={user.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">{user.name} <span className="text-muted">· {user.email}</span></span>
            <span className="shrink-0 text-xs text-muted">{formatDate(user.createdAt)}</span>
          </li>)}
        </ul>
      </div>
    </div>

    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Latest uploads</h2>
        <Link to="/admin/videos" className="text-xs font-semibold text-lime">Upload a video</Link>
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        {stats.recentVideos.length === 0 && <li className="text-muted">Nothing uploaded yet.</li>}
        {stats.recentVideos.map(video => <li key={video.id} className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate">{video.title} <span className="text-muted">· {video.courseTitle || 'standalone'}</span></span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted"><StatusPill value={video.visibility} /> {formatBytes(video.sizeBytes)}</span>
        </li>)}
      </ul>
    </div>
  </div>
}
