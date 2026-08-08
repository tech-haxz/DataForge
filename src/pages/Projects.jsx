import { useEffect, useState } from 'react'
import { ArrowRight, Download, FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import ProjectOrb from '../components/ProjectOrb'
import { api } from '../lib/api'
import { projects as fallbackProjects } from '../data'
import { Alert, EmptyState, Spinner } from '../components/ui'

const BUY_NOW_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSftfyrr5-EQBpL3xTYQpmIOR7GQRgDc3xr5yCppNNzQwnmMPA/viewform?usp=header'

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
      <div className="eyebrow"><span className="dot" /> Services</div>
      <h1 className="display mt-6 max-w-3xl">Build proof, <span className="text-lime">not promises.</span></h1>
      <p className="mt-6 max-w-xl text-lg text-muted">Choose the level of support you need to turn your idea into credible, career-ready proof.</p>
    </Reveal>

    {error && <div className="mt-10"><Alert>Showing the offline library — {error}</Alert></div>}

    {loading ? <p className="mt-16 flex items-center gap-2 text-muted"><Spinner /> Loading projects…</p>
      : projects.length === 0 ? <div className="mt-16"><EmptyState icon={FolderKanban} title="No services available">Our service packages will appear here soon.</EmptyState></div>
        : <div className="mt-16 grid gap-6 md:grid-cols-2">
          {projects.map((project, i) => <Reveal delay={i * 0.07} key={project.id || project.title}>
            <article className="card group h-full overflow-hidden p-0">
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-[#111811]">
                {project.hasThumbnail
                  ? <img className="h-full w-full object-cover" src={`/api/projects/${project.id}/thumbnail`} alt={`${project.title} project thumbnail`} />
                  : <ProjectOrb color={project.color} />}
                <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-bold tracking-[.16em] text-white/70">{project.type}</span>
              </div>
              <div className="p-7">
                <h2 className="text-2xl font-semibold">{project.title}</h2>
                <p className="mt-3 min-h-[76px] leading-relaxed text-muted">{project.description}</p>
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted">Benefits</p>
                  <div className="flex flex-wrap gap-2">{project.tags.map((tag, tagIndex) => <span key={tag} className={`tag tag-accent-${tagIndex % 4}`}>{tag}</span>)}</div>
                </div>
                <div className="mt-7 flex items-center gap-4 border-t border-line pt-5">
                  <a href={BUY_NOW_URL} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-sm">
                    Buy now <ArrowRight size={14} />
                  </a>
                  {project.reportUrl && <a href={project.reportUrl} target="_blank" rel="noreferrer" className="btn-ghost px-0 text-sm">
                    Report <Download size={14} />
                  </a>}
                </div>
              </div>
            </article>
          </Reveal>)}
        </div>}

    <Reveal>
      <div className="mt-24 rounded-3xl border border-line bg-lime p-8 text-[#061a35] md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="eyebrow !text-[#061a35]/60">START BUILDING</div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Your proof could be next.</h2>
          </div>
          <Link to="/courses" className="btn-dark">Find a starting point <ArrowRight size={16} /></Link>
        </div>
      </div>
    </Reveal>
  </div>
}
