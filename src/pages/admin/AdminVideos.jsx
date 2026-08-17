import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileVideo, Pencil, PlaySquare, Trash2, Upload } from 'lucide-react'
import { api, formatBytes, formatDate, uploadVideo } from '../../lib/api'
import { Alert, EmptyState, Field, Modal, Spinner, StatusPill } from '../../components/ui'

export default function AdminVideos() {
  const [videos, setVideos] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([api('/videos'), api('/courses?status=all')])
      .then(async ([v, c]) => {
        const detail = await Promise.all(c.courses.map(course => api(`/courses/${course.id}`)))
        setVideos(v.videos); setCourses(c.courses.map((course, index) => ({ ...course, chapters: detail[index].chapters || [] })))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = async video => {
    if (!confirm(`Delete “${video.title}”? The file is removed from storage.`)) return
    try {
      await api(`/videos/${video.id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return <div className="space-y-8">
    <UploadCard courses={courses} onUploaded={load} />

    <section>
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Library</h2>
        <p className="text-sm text-muted">{videos.length} videos · {formatBytes(videos.reduce((sum, v) => sum + v.sizeBytes, 0))}</p>
      </header>

      {error && <div className="mt-5"><Alert>{error}</Alert></div>}

      {loading ? <p className="mt-8 flex items-center gap-2 text-muted"><Spinner /> Loading…</p>
        : videos.length === 0 ? <div className="mt-6"><EmptyState icon={PlaySquare} title="Nothing uploaded yet">Upload your first lesson above — MP4, WebM, MOV and MKV are supported.</EmptyState></div>
          : <div className="mt-6 space-y-3">
            {videos.map(video => <article key={video.id} className="card flex flex-wrap items-center gap-4 py-5">
              <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-line/50">
                {video.hasThumbnail
                  ? <img src={`/api/videos/${video.id}/thumbnail`} alt="" className="h-full w-full object-cover" />
                  : <FileVideo size={18} className="text-muted" />}
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link to={`/watch/${video.id}`} className="font-semibold hover:text-lime">{video.title}</Link>
                  <StatusPill value={video.visibility} />
                </div>
                <p className="mt-1 text-sm text-muted">{video.courseTitle || 'Standalone'} · {formatBytes(video.sizeBytes)} · {formatDate(video.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-line p-2 hover:text-lime" onClick={() => setEditing(video)} aria-label="Edit"><Pencil size={15} /></button>
                <button className="rounded-lg border border-line p-2 hover:text-rose-500" onClick={() => remove(video)} aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </article>)}
          </div>}
    </section>

    {editing && <EditVideo video={editing} courses={courses} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
  </div>
}

function UploadCard({ courses, onUploaded }) {
  const fileInput = useRef(null)
  const [file, setFile] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', courseId: '', chapterId: '', visibility: 'enrolled' })
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(null)
  const [status, setStatus] = useState(null)
  const [details, setDetails] = useState({})

  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))

  const pickFile = selected => {
    if (!selected) return
    setFile(selected)
    setDetails({})
    setStatus(null)
    if (!form.title) setForm(f => ({ ...f, title: selected.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }))

    // Read the real duration in the browser so the list can show lesson lengths.
    const url = URL.createObjectURL(selected)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      setDuration(Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0)
      URL.revokeObjectURL(url)
    }
    probe.onerror = () => URL.revokeObjectURL(url)
    probe.src = url
  }

  const submit = async event => {
    event.preventDefault()
    if (!file) return setStatus({ kind: 'error', message: 'Choose a video file first.' })

    const data = new FormData()
    data.append('video', file)
    if (thumbnail) data.append('thumbnail', thumbnail)
    data.append('title', form.title)
    data.append('description', form.description)
    data.append('visibility', form.visibility)
    if (form.courseId) data.append('courseId', form.courseId)
    if (form.chapterId) data.append('chapterId', form.chapterId)
    if (duration) data.append('duration', String(duration))

    setStatus(null)
    setDetails({})
    setProgress(0)
    try {
      await uploadVideo(data, { onProgress: setProgress })
      setStatus({ kind: 'success', message: `“${form.title}” is live.` })
      setForm({ title: '', description: '', courseId: form.courseId, chapterId: form.chapterId, visibility: form.visibility })
      setFile(null)
      setThumbnail(null)
      setDuration(0)
      if (fileInput.current) fileInput.current.value = ''
      onUploaded()
    } catch (err) {
      setStatus({ kind: 'error', message: err.message })
      setDetails(err.details || {})
    } finally {
      setProgress(null)
    }
  }

  return <form className="card space-y-4" onSubmit={submit}>
    <div className="flex items-center gap-3">
      <div className="icon-box"><Upload size={20} /></div>
      <div>
        <h2 className="text-xl font-semibold">Upload a lesson</h2>
        <p className="text-sm text-muted">MP4, WebM, MOV or MKV</p>
      </div>
    </div>

    {status && <Alert kind={status.kind}>{status.message}</Alert>}

    <label
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center transition-colors hover:border-lime"
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); pickFile(event.dataTransfer.files?.[0]) }}
    >
      <FileVideo size={24} className="text-lime" />
      {file
        ? <><span className="font-semibold">{file.name}</span><span className="text-sm text-muted">{formatBytes(file.size)}{duration ? ` · ${Math.floor(duration / 60)}m ${duration % 60}s` : ''}</span></>
        : <><span className="font-semibold">Drop a video here</span><span className="text-sm text-muted">or click to browse</span></>}
      <input ref={fileInput} type="file" accept="video/*" className="hidden" onChange={event => pickFile(event.target.files?.[0])} />
    </label>

    <Field label="Title" error={details.title}>
      <input className="field" value={form.title} onChange={set('title')} required />
    </Field>
    <Field label="Description" hint="optional" error={details.description}>
      <textarea className="field min-h-20 resize-none" value={form.description} onChange={set('description')} />
    </Field>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Course" error={details.courseId}>
        <select className="field" value={form.courseId} onChange={set('courseId')}>
          <option value="">Standalone (no course)</option>
          {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
      </Field>
      <Field label="Chapter" hint="optional · keeps recordings in syllabus order" error={details.chapterId}>
        <select className="field" value={form.chapterId} onChange={set('chapterId')} disabled={!form.courseId}>
          <option value="">No chapter</option>
          {courses.find(course => String(course.id) === String(form.courseId))?.chapters?.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
        </select>
      </Field>
      <Field label="Who can watch" error={details.visibility}>
        <select className="field" value={form.visibility} onChange={set('visibility')}>
          <option value="enrolled">Enrolled students</option>
          <option value="public">Anyone</option>
          <option value="private">Staff only</option>
        </select>
      </Field>
    </div>

    <Field label="Thumbnail" hint="optional · JPG, PNG, WebP">
      <input className="field" type="file" accept="image/*" onChange={event => setThumbnail(event.target.files?.[0] || null)} />
    </Field>

    {progress !== null && <div>
      <div className="flex justify-between text-xs font-semibold text-muted"><span>Uploading…</span><span>{progress}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>}

    <button className="btn-primary" disabled={progress !== null}>
      {progress !== null ? <><Spinner /> Uploading</> : <><Upload size={16} /> Upload video</>}
    </button>
  </form>
}

function EditVideo({ video, courses, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: video.title,
    description: video.description,
    courseId: video.courseId ?? '',
    chapterId: video.chapterId ?? '',
    visibility: video.visibility,
    position: video.position
  })
  const [error, setError] = useState('')
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(false)

  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setDetails({})
    try {
      await api(`/videos/${video.id}`, {
        method: 'PATCH',
        body: {
          title: form.title,
          description: form.description,
          courseId: form.courseId === '' ? 0 : Number(form.courseId),
          chapterId: form.chapterId === '' ? 0 : Number(form.chapterId),
          visibility: form.visibility,
          position: Number(form.position) || 0
        }
      })
      onSaved()
    } catch (err) {
      setError(err.message)
      setDetails(err.details || {})
    } finally {
      setBusy(false)
    }
  }

  return <Modal title="Edit lesson" onClose={onClose}>
    <form className="space-y-4" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <Field label="Title" error={details.title}><input className="field" value={form.title} onChange={set('title')} required /></Field>
      <Field label="Description" error={details.description}><textarea className="field min-h-20 resize-none" value={form.description} onChange={set('description')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" error={details.courseId}>
          <select className="field" value={form.courseId} onChange={set('courseId')}>
            <option value="">Standalone</option>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </Field>
        <Field label="Who can watch" error={details.visibility}>
          <select className="field" value={form.visibility} onChange={set('visibility')}>
            <option value="enrolled">Enrolled students</option>
            <option value="public">Anyone</option>
            <option value="private">Staff only</option>
          </select>
        </Field>
      </div>
      <Field label="Chapter" error={details.chapterId}><select className="field" value={form.chapterId} onChange={set('chapterId')} disabled={!form.courseId}><option value="">No chapter</option>{courses.find(course => String(course.id) === String(form.courseId))?.chapters?.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></Field>
      <Field label="Position in course" hint="lower shows first" error={details.position}>
        <input className="field" type="number" min="0" value={form.position} onChange={set('position')} />
      </Field>
      <div className="flex gap-3 pt-2">
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Save changes'}</button>
        <button type="button" className="btn-ghost border border-line" onClick={onClose}>Cancel</button>
      </div>
    </form>
  </Modal>
}
