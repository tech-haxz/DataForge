import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert, EmptyState, Field, Modal, Spinner, StatusPill } from '../../components/ui'

const blank = { title: '', summary: '', description: '', level: 'Beginner-friendly', schedule: '', seats: 20, priceCents: 0, accent: '#1689ea', status: 'draft' }

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [students, setStudents] = useState(null)

  const load = () => {
    setLoading(true)
    api('/courses?status=all')
      .then(({ courses }) => setCourses(courses))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = async course => {
    if (!confirm(`Delete “${course.title}”? Enrollments for this course are removed too.`)) return
    try {
      await api(`/courses/${course.id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const showStudents = async course => {
    setStudents({ course, list: null })
    try {
      const { students } = await api(`/courses/${course.id}/students`)
      setStudents({ course, list: students })
    } catch (err) {
      setStudents({ course, list: [], error: err.message })
    }
  }

  return <div>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Courses</h2>
        <p className="text-sm text-muted">{courses.length} total</p>
      </div>
      <button className="btn-primary px-4 py-2 text-sm" onClick={() => setEditing(blank)}><Plus size={16} /> New course</button>
    </header>

    {error && <div className="mt-5"><Alert>{error}</Alert></div>}

    {loading ? <p className="mt-8 flex items-center gap-2 text-muted"><Spinner /> Loading…</p>
      : courses.length === 0 ? <div className="mt-8"><EmptyState icon={GraduationCap} title="No courses yet">Create your first cohort to start enrolling students.</EmptyState></div>
        : <div className="mt-6 space-y-3">
          {courses.map(course => <article key={course.id} className="card flex flex-wrap items-center gap-4 py-5">
            <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: course.accent }} />
            <div className="min-w-[200px] flex-1">
              <div className="flex items-center gap-2.5">
                <Link to={`/courses/${course.slug}`} className="font-semibold hover:text-lime">{course.title}</Link>
                <StatusPill value={course.status} />
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted">{course.summary || 'No summary yet'}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted">
              <button className="flex items-center gap-1.5 hover:text-ink" onClick={() => showStudents(course)}>
                <Users size={15} /> {course.studentCount}/{course.seats || '∞'}
              </button>
              <span>{course.videoCount} lessons</span>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg border border-line p-2 hover:text-lime" onClick={() => setEditing(course)} aria-label="Edit"><Pencil size={15} /></button>
              <button className="rounded-lg border border-line p-2 hover:text-rose-500" onClick={() => remove(course)} aria-label="Delete"><Trash2 size={15} /></button>
            </div>
          </article>)}
        </div>}

    {editing && <CourseForm course={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}

    {students && <Modal title={`Students · ${students.course.title}`} onClose={() => setStudents(null)}>
      {students.error && <Alert>{students.error}</Alert>}
      {!students.list ? <p className="flex items-center gap-2 text-muted"><Spinner /> Loading…</p>
        : students.list.length === 0 ? <p className="text-sm text-muted">Nobody has enrolled yet.</p>
          : <ul className="space-y-3 text-sm">
            {students.list.map(student => <li key={student.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{student.name} <span className="text-muted">· {student.email}</span></span>
            </li>)}
          </ul>}
    </Modal>}
  </div>
}

function CourseForm({ course, onClose, onSaved }) {
  const [form, setForm] = useState({ ...blank, ...course })
  const [error, setError] = useState('')
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(false)

  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setDetails({})
    const body = {
      title: form.title,
      summary: form.summary,
      description: form.description,
      level: form.level,
      schedule: form.schedule,
      seats: Number(form.seats) || 0,
      priceCents: Number(form.priceCents) || 0,
      accent: form.accent,
      status: form.status
    }
    try {
      if (course.id) await api(`/courses/${course.id}`, { method: 'PATCH', body })
      else await api('/courses', { method: 'POST', body })
      onSaved()
    } catch (err) {
      setError(err.message)
      setDetails(err.details || {})
    } finally {
      setBusy(false)
    }
  }

  return <Modal title={course.id ? 'Edit course' : 'New course'} onClose={onClose} wide>
    <form className="space-y-4" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <Field label="Title" error={details.title}>
        <input className="field" value={form.title} onChange={set('title')} required />
      </Field>
      <Field label="Summary" hint="one line" error={details.summary}>
        <input className="field" value={form.summary} onChange={set('summary')} />
      </Field>
      <Field label="Description" error={details.description}>
        <textarea className="field min-h-24 resize-none" value={form.description} onChange={set('description')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level" error={details.level}><input className="field" value={form.level} onChange={set('level')} /></Field>
        <Field label="Schedule" error={details.schedule}><input className="field" value={form.schedule} onChange={set('schedule')} placeholder="FEB 03 — MAR 28" /></Field>
        <Field label="Seats" hint="0 = unlimited" error={details.seats}><input className="field" type="number" min="0" value={form.seats} onChange={set('seats')} /></Field>
        <Field label="Price (cents)" error={details.priceCents}><input className="field" type="number" min="0" value={form.priceCents} onChange={set('priceCents')} /></Field>
        <Field label="Accent colour" error={details.accent}><input className="field h-12 p-1" type="color" value={form.accent} onChange={set('accent')} /></Field>
        <Field label="Status" error={details.status}>
          <select className="field" value={form.status} onChange={set('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-3 pt-2">
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Save course'}</button>
        <button type="button" className="btn-ghost border border-line" onClick={onClose}>Cancel</button>
      </div>
    </form>
  </Modal>
}
