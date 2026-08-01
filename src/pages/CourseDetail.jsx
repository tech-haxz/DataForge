import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Lock, PlayCircle, Users } from 'lucide-react'
import { api, formatDuration } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Alert, EmptyState, Spinner, StatusPill } from '../components/ui'
import Reveal from '../components/Reveal'

export default function CourseDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const [state, setState] = useState({ loading: true, course: null, videos: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api(`/courses/${slug}`)
      .then(({ course, videos }) => setState({ loading: false, course, videos }))
      .catch(err => { setError(err.message); setState(s => ({ ...s, loading: false })) })
  }, [slug])

  useEffect(load, [load])

  const toggleEnrollment = async () => {
    if (!user) return navigate('/login', { state: { from: `/courses/${slug}` } })
    setBusy(true)
    setError('')
    try {
      await api(`/courses/${state.course.id}/enroll`, { method: state.course.enrolled ? 'DELETE' : 'POST' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (state.loading) return <div className="container pb-24 pt-36 text-muted"><Spinner /> Loading course…</div>
  if (!state.course) return <div className="container pb-24 pt-36"><Alert>{error || 'Course not found'}</Alert></div>

  const { course, videos } = state
  const price = course.priceCents ? `$${(course.priceCents / 100).toFixed(0)}` : 'Free'

  return <div className="container pb-24 pt-36">
    <Link to="/courses" className="btn-ghost px-0 text-sm text-muted"><ArrowLeft size={15} /> All courses</Link>

    <div className="mt-6 grid gap-12 lg:grid-cols-[1.2fr_.8fr] lg:items-start">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill value={course.status} />
          <span className="text-xs font-bold tracking-[.15em] text-muted">{course.level}</span>
        </div>
        <h1 className="display mt-5">{course.title}</h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{course.summary}</p>
        {course.description && <p className="mt-5 max-w-xl leading-relaxed text-muted">{course.description}</p>}

        <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted">
          {course.schedule && <span className="flex items-center gap-2"><CalendarDays size={16} /> {course.schedule}</span>}
          <span className="flex items-center gap-2"><Users size={16} /> {course.studentCount} enrolled{course.seats ? ` · ${Math.max(0, course.seats - course.studentCount)} seats left` : ''}</span>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="card">
          <div className="text-3xl font-bold tracking-tight">{price}</div>
          <p className="mt-2 text-sm text-muted">{course.videoCount} lessons · lifetime access to recordings</p>
          {error && <div className="mt-5"><Alert>{error}</Alert></div>}
          <button className={`mt-6 w-full justify-center ${course.enrolled ? 'btn-ghost border border-line' : 'btn-primary'}`} onClick={toggleEnrollment} disabled={busy}>
            {busy ? <Spinner /> : course.enrolled ? 'Leave this cohort' : user ? 'Reserve your seat' : 'Sign in to enroll'}
          </button>
          {course.enrolled && <p className="mt-4 text-center text-xs font-semibold text-lime">You are enrolled — every lesson below is unlocked.</p>}
        </div>
      </Reveal>
    </div>

    <section className="mt-20 border-t border-line pt-14">
      <h2 className="text-sm font-bold uppercase tracking-[.18em] text-muted">Lessons</h2>
      {videos.length === 0
        ? <div className="mt-6"><EmptyState icon={PlayCircle} title="No lessons published yet">Recordings appear here as soon as the team uploads them.</EmptyState></div>
        : <ol className="mt-6 space-y-3">
          {videos.map((video, index) => {
            const locked = video.locked && !isStaff
            const Row = locked ? 'div' : Link
            return <li key={video.id}>
              <Row {...(locked ? {} : { to: `/watch/${video.id}` })} className={`card flex items-center gap-4 py-5 ${locked ? 'opacity-60' : ''}`}>
                <span className="w-6 shrink-0 text-sm font-bold text-muted">{String(index + 1).padStart(2, '0')}</span>
                {locked ? <Lock size={20} className="shrink-0 text-muted" /> : <PlayCircle size={22} className="shrink-0 text-lime" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{video.title}</p>
                  {video.description && <p className="truncate text-sm text-muted">{video.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  {video.duration > 0 && <span>{formatDuration(video.duration)}</span>}
                  <StatusPill value={video.visibility} />
                </div>
              </Row>
            </li>
          })}
        </ol>}
    </section>
  </div>
}
