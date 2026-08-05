import { useEffect, useState } from 'react'
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, uploadProjectThumbnail } from '../../lib/api'
import { Alert, EmptyState, Field, Modal, Spinner, StatusPill } from '../../components/ui'

const blank = { title: '', type: 'FULL-STACK', description: '', tags: '', color: '#b8ff3d', demoUrl: '', reportUrl: '', status: 'published', hasThumbnail: false }

export default function AdminProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    api('/projects')
      .then(({ projects }) => setProjects(projects))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = async project => {
    if (!confirm(`Delete “${project.title}”?`)) return
    try {
      await api(`/projects/${project.id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return <div>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Services</h2>
        <p className="text-sm text-muted">{projects.length} services in the library</p>
      </div>
      <button className="btn-primary px-4 py-2 text-sm" onClick={() => setEditing(blank)}><Plus size={16} /> New service</button>
    </header>

    {error && <div className="mt-5"><Alert>{error}</Alert></div>}

    {loading ? <p className="mt-8 flex items-center gap-2 text-muted"><Spinner /> Loading…</p>
      : projects.length === 0 ? <div className="mt-6"><EmptyState icon={FolderKanban} title="No services yet">Create a service package for your students.</EmptyState></div>
        : <div className="mt-6 grid gap-4 md:grid-cols-2">
          {projects.map(project => <article key={project.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full" style={{ background: project.color }} />
                <div>
                  <h3 className="font-semibold">{project.title}</h3>
                  <p className="text-[11px] font-bold tracking-[.15em] text-muted">{project.type}</p>
                </div>
              </div>
              <StatusPill value={project.status} />
            </div>
            <p className="mt-4 line-clamp-2 text-sm text-muted">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">{project.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>
            <div className="mt-5 flex gap-2 border-t border-line pt-4">
              <button className="rounded-lg border border-line p-2 hover:text-lime" onClick={() => setEditing({ ...project, tags: project.tags.join(', ') })} aria-label="Edit"><Pencil size={15} /></button>
              <button className="rounded-lg border border-line p-2 hover:text-rose-500" onClick={() => remove(project)} aria-label="Delete"><Trash2 size={15} /></button>
            </div>
          </article>)}
        </div>}

    {editing && <ProjectForm project={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
  </div>
}

function ProjectForm({ project, onClose, onSaved }) {
  const [form, setForm] = useState({ ...blank, ...project })
  const [error, setError] = useState('')
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(false)
  const [thumbnail, setThumbnail] = useState(null)

  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setDetails({})
    const body = {
      title: form.title,
      type: form.type,
      description: form.description,
      tags: String(form.tags).split(',').map(t => t.trim()).filter(Boolean),
      color: form.color,
      demoUrl: form.demoUrl,
      reportUrl: form.reportUrl,
      status: form.status
    }
    try {
      const saved = project.id
        ? await api(`/projects/${project.id}`, { method: 'PATCH', body })
        : await api('/projects', { method: 'POST', body })
      if (thumbnail) await uploadProjectThumbnail(saved.project.id, thumbnail)
      onSaved()
    } catch (err) {
      setError(err.message)
      setDetails(err.details || {})
    } finally {
      setBusy(false)
    }
  }

  return <Modal title={project.id ? 'Edit service' : 'New service'} onClose={onClose} wide>
    <form className="space-y-4" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <Field label="Title" error={details.title}><input className="field" value={form.title} onChange={set('title')} required /></Field>
      <Field label="Category" hint="shown in caps" error={details.type}><input className="field" value={form.type} onChange={set('type')} /></Field>
      <Field label="Description" error={details.description}><textarea className="field min-h-20 resize-none" value={form.description} onChange={set('description')} /></Field>
      <Field label="Thumbnail" hint="optional · JPG, PNG, WebP, AVIF" error={details.thumbnail}>
        <input className="field" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => setThumbnail(event.target.files?.[0] || null)} />
      </Field>
      <Field label="Tags" hint="comma separated" error={details.tags}><input className="field" value={form.tags} onChange={set('tags')} placeholder="React, Node.js, PostgreSQL" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Demo URL" error={details.demoUrl}><input className="field" value={form.demoUrl} onChange={set('demoUrl')} placeholder="https://" /></Field>
        <Field label="Report URL" error={details.reportUrl}><input className="field" value={form.reportUrl} onChange={set('reportUrl')} placeholder="https://" /></Field>
        <Field label="Accent colour" error={details.color}><input className="field h-12 p-1" type="color" value={form.color} onChange={set('color')} /></Field>
        <Field label="Status" error={details.status}>
          <select className="field" value={form.status} onChange={set('status')}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-3 pt-2">
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Save project'}</button>
        <button type="button" className="btn-ghost border border-line" onClick={onClose}>Cancel</button>
      </div>
    </form>
  </Modal>
}
