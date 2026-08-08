import { Link } from 'react-router-dom'

export default function Footer() {
  return <footer className="border-t border-line py-12">
    <div className="container flex flex-col justify-between gap-7 md:flex-row">
      <div>
        <div className="text-lg font-extrabold">Open<span className="text-lime">Doc</span><span className="text-lime">.</span></div>
        <p className="mt-2 max-w-xs text-sm text-muted">A calmer, sharper way to build your technical career.</p>
      </div>
      <div className="flex gap-6 text-sm text-muted">
        <Link to="/projects" className="hover:text-ink">Services</Link>
        <Link to="/courses" className="hover:text-ink">Courses</Link>
        <Link to="/mentorship" className="hover:text-ink">Mentorship</Link>
      </div>
      <div className="text-sm text-muted">© 2026 OpenDoc</div>
    </div>
  </footer>
}
