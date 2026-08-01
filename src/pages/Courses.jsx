import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { api } from '../lib/api'
import { Alert, EmptyState, Spinner } from '../components/ui'

const syllabus = ['The fundamentals, without the fluff', 'Build a real product from week one', 'Code reviews that teach you to think', 'Ship, document, and tell your story']

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/courses')
      .then(({ courses }) => setCourses(courses))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return <div className="container pb-24 pt-36">
    <Reveal>
      <div className="eyebrow"><span className="dot" /> Live learning, real momentum</div>
      <h1 className="display mt-6 max-w-4xl">A class is good.<br /><span className="text-lime">A cohort is better.</span></h1>
      <p className="mt-6 max-w-xl text-lg text-muted">Small groups, live classes, thoughtful curriculum, and the kind of energy that gets you to open your editor on a Monday.</p>
    </Reveal>

    {error && <div className="mt-10"><Alert>{error}</Alert></div>}

    {loading ? <p className="mt-16 flex items-center gap-2 text-muted"><Spinner /> Loading cohorts…</p>
      : courses.length === 0 ? <div className="mt-16"><EmptyState icon={CalendarDays} title="No open cohorts right now">New dates are announced here — check back soon or talk to a mentor.</EmptyState></div>
        : <div className="mt-16 grid gap-5 lg:grid-cols-2">
          {courses.map((course, i) => <Reveal delay={i * 0.1} key={course.id}>
            <div className="card relative h-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1" style={{ background: course.accent }} />
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold tracking-[.15em] text-muted">
                <CalendarDays size={15} /> {course.schedule || 'FLEXIBLE START'}
              </div>
              <h2 className="mt-6 text-2xl font-semibold">{course.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{course.summary}</p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted">
                <span className="flex items-center gap-2"><Clock3 size={16} /> {course.videoCount} lessons</span>
                <span className="flex items-center gap-2">
                  <Users size={16} /> {course.seats ? `${Math.max(0, course.seats - course.studentCount)} seats left` : `${course.studentCount} enrolled`}
                </span>
              </div>
              <p className="mt-8 text-sm font-semibold text-lime">{course.level}</p>
              <Link to={`/courses/${course.slug}`} className="btn-primary mt-7">Reserve your seat <ArrowRight size={16} /></Link>
            </div>
          </Reveal>)}
        </div>}

    <section className="mt-24 grid gap-12 border-t border-line pt-20 lg:grid-cols-[.85fr_1fr]">
      <Reveal>
        <div className="eyebrow">CURRICULUM</div>
        <h2 className="heading mt-5">Learn the way<br /><span className="text-lime">you wish you had.</span></h2>
        <p className="mt-6 max-w-md leading-relaxed text-muted">Every module is designed around a project, so you leave with more than notes — you leave with evidence.</p>
        <Link to="/mentorship" className="btn-ghost mt-8 px-0">Talk to a mentor <ArrowRight size={16} /></Link>
      </Reveal>
      <div className="space-y-3">
        {syllabus.map((item, i) => <Reveal delay={i * 0.08} key={item}>
          <div className="flex items-center gap-5 rounded-xl border border-line bg-panel p-5">
            <span className="text-sm font-bold text-lime">0{i + 1}</span>
            <span className="font-medium">{item}</span>
            <ArrowRight size={16} className="ml-auto text-muted" />
          </div>
        </Reveal>)}
      </div>
    </section>
  </div>
}
