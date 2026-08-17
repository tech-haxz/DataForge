import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChevronDown, Lock, PlayCircle, Users } from 'lucide-react'
import { api, formatDuration } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Alert, EmptyState, Spinner, StatusPill } from '../components/ui'
import Reveal from '../components/Reveal'

export default function CourseDetail() {
  const { slug } = useParams()
  const { isStaff } = useAuth()
  const [state, setState] = useState({ loading: true, course: null, chapters: [], videos: [] })
  const [expandedChapters, setExpandedChapters] = useState({})
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api(`/courses/${slug}`)
      .then(({ course, chapters = [], videos }) => setState({ loading: false, course, chapters, videos }))
      .catch(err => { setError(err.message); setState(s => ({ ...s, loading: false })) })
  }, [slug])

  useEffect(load, [load])

  const reserveSeat = () => { window.location.href = 'https://forms.gle/wzWRpDrkdofpzX2k8' }

  if (state.loading) return <div className="container pb-24 pt-36 text-muted"><Spinner /> Loading course…</div>
  if (!state.course) return <div className="container pb-24 pt-36"><Alert>{error || 'Course not found'}</Alert></div>

  const { course, chapters, videos } = state
  const toggleChapter = chapterId => setExpandedChapters(current => ({ ...current, [chapterId]: !current[chapterId] }))
  const price = course.priceCents ? `₹${(course.priceCents).toFixed(0)}` : 'Free'

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
          <button className="btn-primary mt-6 w-full justify-center" onClick={reserveSeat}>
            Reserve your seat
          </button>
          {course.enrolled && <p className={`mt-4 text-center text-xs font-semibold ${course.paymentVerified ? 'text-lime' : 'text-muted'}`}>{course.paymentVerified ? 'Payment verified — recordings unlocked.' : 'Registration received — recording access is pending payment verification.'}</p>}
        </div>
      </Reveal>
    </div>

    <section className="mt-20 border-t border-line pt-14">
      <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[.18em] text-muted">Syllabus</h2>
          {course.syllabus && <p className="mt-5 whitespace-pre-line leading-relaxed text-muted">{course.syllabus}</p>}
          {chapters.length > 0 && <ol className="mt-6 space-y-3">
            {chapters.map((chapter, index) => <li key={chapter.id} className="rounded-xl border border-line p-4">
              <div className="flex gap-3"><span className="text-sm font-bold text-muted">{String(index + 1).padStart(2, '0')}</span><div><p className="font-semibold">{chapter.title}</p>{chapter.description && <p className="mt-1 text-sm text-muted">{chapter.description}</p>}<p className="mt-2 text-xs text-muted">{chapter.videoCount} recording{chapter.videoCount === 1 ? '' : 's'}</p></div></div>
            </li>)}
          </ol>}
          {!course.syllabus && chapters.length === 0 && <p className="mt-5 text-sm text-muted">The syllabus will be published soon.</p>}
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[.18em] text-muted">Recordings</h2>
      {videos.length === 0
        ? <div className="mt-6"><EmptyState icon={PlayCircle} title="No lessons published yet">Recordings appear here as soon as the team uploads them.</EmptyState></div>
        : <div className="mt-6 space-y-8">
          {chapters.map(chapter => {
            const chapterVideos = videos.filter(video => video.chapterId === chapter.id)
            const expanded = Boolean(expandedChapters[chapter.id])
            return <div key={chapter.id} className="overflow-hidden rounded-2xl border border-line">
              <button type="button" className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-line/20" onClick={() => toggleChapter(chapter.id)} aria-expanded={expanded}>
                <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                <span className="min-w-0 flex-1 font-semibold">{chapter.title}</span>
                <span className="shrink-0 text-xs text-muted">{chapterVideos.length} recording{chapterVideos.length === 1 ? '' : 's'}</span>
              </button>
              {expanded && <ol className="space-y-3 border-t border-line p-3">
                {chapterVideos.map((video, index) => {
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
            </div>
          })}
          {videos.filter(video => !video.chapterId).length > 0 && (() => {
            const additionalVideos = videos.filter(video => !video.chapterId)
            const expanded = Boolean(expandedChapters.additional)
            return <div className="overflow-hidden rounded-2xl border border-line">
              <button type="button" className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-line/20" onClick={() => toggleChapter('additional')} aria-expanded={expanded}>
                <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                <span className="min-w-0 flex-1 font-semibold">Additional recordings</span>
                <span className="shrink-0 text-xs text-muted">{additionalVideos.length} recording{additionalVideos.length === 1 ? '' : 's'}</span>
              </button>
              {expanded && <ol className="space-y-3 border-t border-line p-3">{additionalVideos.map(video => { const locked = video.locked && !isStaff; const Row = locked ? 'div' : Link; return <li key={video.id}><Row {...(locked ? {} : { to: `/watch/${video.id}` })} className={`card flex items-center gap-4 py-5 ${locked ? 'opacity-60' : ''}`}><span className="w-6 shrink-0 text-sm font-bold text-muted">•</span>{locked ? <Lock size={20} className="shrink-0 text-muted" /> : <PlayCircle size={22} className="shrink-0 text-lime" />}<span className="min-w-0 flex-1 truncate font-semibold">{video.title}</span></Row></li>})}</ol>}
            </div>
          })()}
        </div>}
        </div>
      </div>
    </section>
  </div>
}
