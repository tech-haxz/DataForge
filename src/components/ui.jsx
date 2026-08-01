import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'

export function Field({ label, error, children, hint }) {
  return <label className="field-label block">
    <span className="flex items-center justify-between">{label}{hint && <span className="text-xs font-normal text-muted">{hint}</span>}</span>
    {children}
    {error && <span className="mt-1.5 block text-xs font-medium text-rose-500">{error}</span>}
  </label>
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null
  const styles = kind === 'success'
    ? 'border-lime/40 bg-lime/10 text-ink'
    : 'border-rose-400/40 bg-rose-400/10 text-rose-500'
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle
  return <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`}>
    <Icon size={17} className="mt-px shrink-0" /> <span>{children}</span>
  </div>
}

export const Spinner = ({ size = 16 }) => <Loader2 size={size} className="animate-spin" />

export function StatusPill({ value }) {
  const tone = {
    published: 'bg-lime/15 text-lime border-lime/30',
    active: 'bg-lime/15 text-lime border-lime/30',
    draft: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
    new: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
    archived: 'bg-slate-400/15 text-muted border-slate-400/30',
    closed: 'bg-slate-400/15 text-muted border-slate-400/30',
    suspended: 'bg-rose-400/15 text-rose-500 border-rose-400/30',
    contacted: 'bg-sky-400/15 text-sky-500 border-sky-400/30',
    public: 'bg-lime/15 text-lime border-lime/30',
    enrolled: 'bg-sky-400/15 text-sky-500 border-sky-400/30',
    private: 'bg-slate-400/15 text-muted border-slate-400/30',
    admin: 'bg-fuchsia-400/15 text-fuchsia-500 border-fuchsia-400/30',
    instructor: 'bg-sky-400/15 text-sky-500 border-sky-400/30',
    student: 'bg-slate-400/15 text-muted border-slate-400/30'
  }[value] || 'bg-slate-400/15 text-muted border-slate-400/30'

  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${tone}`}>{value}</span>
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = event => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  return <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className={`card my-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><X size={20} /></button>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  </div>
}

export function EmptyState({ icon: Icon, title, children }) {
  return <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
    {Icon && <Icon className="mx-auto text-muted" size={26} />}
    <h3 className="mt-4 font-semibold">{title}</h3>
    {children && <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{children}</p>}
  </div>
}
