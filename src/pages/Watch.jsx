import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { api, formatBytes, formatDate } from '../lib/api'
import { Alert, Spinner, StatusPill } from '../components/ui'

export default function Watch() {
  const { id } = useParams()
  const videoRef = useRef(null)
  const lastSaved = useRef(0)
  const [state, setState] = useState({ loading: true, video: null, canWatch: false, reason: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    setState(s => ({ ...s, loading: true }))
    api(`/videos/${id}`)
      .then(({ video, canWatch, reason }) => setState({ loading: false, video, canWatch, reason: reason || '' }))
      .catch(err => { setError(err.message); setState(s => ({ ...s, loading: false })) })
  }, [id])

  // Resume from the last saved position once metadata is ready.
  const handleLoaded = () => {
    const seconds = state.video?.progressSeconds || 0
    if (seconds > 5 && videoRef.current) videoRef.current.currentTime = seconds
  }

  const saveProgress = (seconds, completed = false) => {
    api(`/videos/${id}/progress`, { method: 'POST', body: { seconds: Math.floor(seconds), completed } }).catch(() => { /* best effort */ })
  }

  // Throttled to roughly one write every 10 seconds of playback.
  const handleTimeUpdate = event => {
    const seconds = event.target.currentTime
    if (Math.abs(seconds - lastSaved.current) < 10) return
    lastSaved.current = seconds
    saveProgress(seconds)
  }

  if (state.loading) return <div className="container pb-24 pt-36 text-muted"><Spinner /> Loading lesson…</div>
  if (!state.video) return <div className="container pb-24 pt-36"><Alert>{error || 'Lesson not found'}</Alert></div>

  const { video, canWatch, reason } = state

  return <div className="container pb-24 pt-36">
    <Link to={video.courseId ? `/courses/${video.courseId}` : '/courses'} className="btn-ghost px-0 text-sm text-muted">
      <ArrowLeft size={15} /> {video.courseTitle || 'Back to courses'}
    </Link>

    <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-black">
      {canWatch
        ? <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          controls
          preload="metadata"
          poster={video.hasThumbnail ? `/api/videos/${video.id}/thumbnail` : undefined}
          onLoadedMetadata={handleLoaded}
          onTimeUpdate={handleTimeUpdate}
          onEnded={event => saveProgress(event.target.currentTime, true)}
        >
          <source src={`/api/videos/${video.id}/stream`} type={video.mimeType} />
          Your browser cannot play this video.
        </video>
        : <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
          <Lock size={28} />
          <p className="max-w-sm text-sm">{reason || 'This lesson is locked.'}</p>
          {video.courseId && <Link to={`/courses/${video.courseId}`} className="btn-primary px-4 py-2 text-sm">Go to the course</Link>}
        </div>}
    </div>

    <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_.6fr] lg:items-start">
      <div>
        <h1 className="heading">{video.title}</h1>
        {video.description && <p className="mt-5 max-w-2xl leading-relaxed text-muted">{video.description}</p>}
      </div>
      <div className="card text-sm">
        <dl className="space-y-3">
          <Row label="Course">{video.courseTitle || 'Standalone'}</Row>
          <Row label="Access"><StatusPill value={video.visibility} /></Row>
          <Row label="Size">{formatBytes(video.sizeBytes)}</Row>
          <Row label="Uploaded">{formatDate(video.createdAt)}</Row>
        </dl>
      </div>
    </div>
  </div>
}

const Row = ({ label, children }) => <div className="flex items-center justify-between gap-4">
  <dt className="text-muted">{label}</dt>
  <dd className="font-semibold">{children}</dd>
</div>
