import { useEffect, useState } from 'react'
import { ArrowRight, Download, ExternalLink, FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import ProjectOrb from '../components/ProjectOrb'
import { api } from '../lib/api'
import { projects as fallbackProjects } from '../data'
import { Alert, EmptyState, Spinner } from '../components/ui'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/projects')
      .then(({ projects }) => setProjects(projects))
      // The static library keeps the page presentable if the API is unreachable.
      .catch(err => { setError(err.message); setProjects(fallbackProjects) })
      .finally(() => setLoading(false))
  }, [])

  return <div className="container pb-24 pt-36">
    <Reveal>
      <div className="eyebrow"><span className="dot" /> Student work library</div>
      <h1 className="display mt-6 max-w-3xl">Ideas, made <span className="text-lime">real.</span></h1>
      <p className="mt-6 max-w-xl text-lg text-muted">A glimpse into what happens when thoughtful people get the right structure, support, and room to experiment.</p>
    </Reveal>

    {error && <div className="mt-10"><Alert>Showing the offline library — {error}</Alert></div>}

    {loading ? <p className="mt-16 flex items-center gap-2 text-muted"><Spinner /> Loading projects…</p>
      : projects.length === 0 ? <div className="mt-16"><EmptyState icon={FolderKanban} title="No projects published yet">Student work shows up here after each cohort ships.</EmptyState></div>
        : <div className="mt-16 grid gap-6 md:grid-cols-2">
          {projects.map((project, i) => <Reveal delay={i * 0.07} key={project.id || project.title}>
            <article className="card group h-full overflow-hidden p-0">
              <div className="relative flex h-52 items-center justify-center overflow-hidden bg-[#111811]">
                <ProjectOrb color={project.color} />
                <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-bold tracking-[.16em] text-white/70">{project.type}</span>
              </div>
              <div className="p-7">
                <h2 className="text-2xl font-semibold">{project.title}</h2>
                <p className="mt-3 min-h-[52px] leading-relaxed text-muted">{project.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">{project.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>
                <div className="mt-7 flex items-center gap-4 border-t border-line pt-5">
                  <a href={project.demoUrl || '#demo'} target={project.demoUrl ? '_blank' : undefined} rel="noreferrer" className="btn-primary px-4 py-2 text-sm">
                    Live demo <ExternalLink size={14} />
                  </a>
                  <a href={project.reportUrl || '#report'} target={project.reportUrl ? '_blank' : undefined} rel="noreferrer" className="btn-ghost px-0 text-sm">
                    Report <Download size={14} />
                  </a>
                </div>
              </div>
            </article>
          </Reveal>)}
        </div>}

    <Reveal>
      <div className="mt-24 rounded-3xl border border-line bg-lime p-8 text-[#10140e] md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="eyebrow !text-[#10140e]/60">MAKE YOUR FIRST SHIP</div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Your project could be next.</h2>
          </div>
          <Link to="/courses" className="btn-dark">Find a starting point <ArrowRight size={16} /></Link>
        </div>
      </div>
    </Reveal>
  </div>
}
