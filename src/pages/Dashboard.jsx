import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, PlayCircle, Save, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, formatDuration } from '../lib/api'
import { Alert, EmptyState, Field, Spinner, StatusPill } from '../components/ui'
import Reveal from '../components/Reveal'

export default function Dashboard() {
  const { user, updateProfile } = useAuth()
  const [courses, setCourses] = useState([])
  const [continueWatching, setContinueWatching] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api('/me/courses'), api('/me/continue')])
      .then(([a, b]) => { setCourses(a.courses); setContinueWatching(b.videos) })
      .catch(() => { /* empty state covers this */ })
      .finally(() => setLoading(false))
  }, [])

  return <div className="container pb-24 pt-36">
    <Reveal>
      <div className="eyebrow"><span className="dot" /> Your workspace</div>
      <h1 className="display mt-6">Hey, {user.name.split(' ')[0]}.</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">Your cohorts, your lessons, your progress — all in one place.</p>
    </Reveal>

    {continueWatching.length > 0 && <section className="mt-14">
      <h2 className="text-sm font-bold uppercase tracking-[.18em] text-muted">Pick up where you left off</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {continueWatching.map(video => <Link key={video.id} to={`/watch/${video.id}`} className="card flex items-center gap-4 py-5">
          <PlayCircle className="shrink-0 text-lime" size={26} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{video.title}</p>
            <p className="truncate text-sm text-muted">{video.courseTitle || 'Standalone lesson'} · {formatDuration(video.progressSeconds)} in</p>
          </div>
        </Link>)}
      </div>
    </section>}

    <section className="mt-14">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[.18em] text-muted">Your courses</h2>
        <Link to="/courses" className="btn-ghost px-0 text-sm">Browse all <ArrowRight size={15} /></Link>
      </div>

      {loading ? <div className="mt-6 flex items-center gap-2 text-muted"><Spinner /> Loading…</div>
        : courses.length === 0 ? <div className="mt-6"><EmptyState icon={GraduationCap} title="No enrollments yet">
          Find a cohort that matches where you are and reserve your seat — it takes one click.
        </EmptyState></div>
          : <div className="mt-6 grid gap-5 md:grid-cols-2">
            {courses.map((course, i) => <Reveal key={course.id} delay={i * 0.06}>
              <article className="card relative h-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1" style={{ background: course.accent }} />
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold">{course.title}</h3>
                  <StatusPill value={course.status} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{course.summary}</p>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted">
                    <span>{course.completedCount}/{course.videoCount} lessons</span>
                    <span>{course.progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${course.progressPercent}%` }} />
                  </div>
                </div>
                <Link to={`/courses/${course.slug}`} className="btn-primary mt-6 px-4 py-2 text-sm">
                  <BookOpen size={15} /> Open course
                </Link>
              </article>
            </Reveal>)}
          </div>}
    </section>

    <ProfileCard user={user} updateProfile={updateProfile} />
  </div>
}

function ProfileCard({ user, updateProfile }) {
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '', currentPassword: '', newPassword: '' })
  const [status, setStatus] = useState(null)
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setStatus(null)
    setDetails({})
    try {
      const body = { name: form.name, bio: form.bio }
      if (form.newPassword) Object.assign(body, { currentPassword: form.currentPassword, newPassword: form.newPassword })
      await updateProfile(body)
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }))
      setStatus({ kind: 'success', message: 'Profile updated.' })
    } catch (err) {
      setStatus({ kind: 'error', message: err.message })
      setDetails(err.details || {})
    } finally {
      setBusy(false)
    }
  }

  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))

  return <section className="mt-20 border-t border-line pt-14">
    <h2 className="text-sm font-bold uppercase tracking-[.18em] text-muted">Your profile</h2>
    <form className="card mt-6 max-w-2xl space-y-4" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <div className="icon-box"><User size={20} /></div>
        <div>
          <p className="font-semibold">{user.email}</p>
          <p className="text-sm text-muted">Role: {user.role}</p>
        </div>
      </div>
      {status && <Alert kind={status.kind}>{status.message}</Alert>}
      <Field label="Name" error={details.name}>
        <input className="field" value={form.name} onChange={set('name')} required />
      </Field>
      <Field label="Short bio" hint="optional" error={details.bio}>
        <textarea className="field min-h-20 resize-none" value={form.bio} onChange={set('bio')} placeholder="What are you working on?" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" hint="to change it" error={details.currentPassword}>
          <input className="field" type="password" value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" />
        </Field>
        <Field label="New password" error={details.newPassword}>
          <input className="field" type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
        </Field>
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <><Save size={16} /> Save changes</>}</button>
    </form>
  </section>
}
