import { useCallback, useEffect, useState } from 'react'
import { Inbox, Mail, Trash2 } from 'lucide-react'
import { api, formatDate } from '../../lib/api'
import { Alert, EmptyState, Spinner, StatusPill } from '../../components/ui'

const filters = ['all', 'new', 'contacted', 'closed']

export default function AdminMentorship() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api(`/mentorship?status=${filter}`)
      .then(({ requests }) => setRequests(requests))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(load, [load])

  const update = async (request, status) => {
    setError('')
    try {
      await api(`/mentorship/${request.id}`, { method: 'PATCH', body: { status } })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async request => {
    if (!confirm(`Delete the request from ${request.email}?`)) return
    setError('')
    try {
      await api(`/mentorship/${request.id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return <div>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Mentorship inbox</h2>
        <p className="text-sm text-muted">{requests.length} requests</p>
      </div>
      <div className="flex gap-2">
        {filters.map(value => <button
          key={value}
          onClick={() => setFilter(value)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${filter === value ? 'border-lime bg-lime text-[#10140e]' : 'border-line text-muted hover:text-ink'}`}
        >{value}</button>)}
      </div>
    </header>

    {error && <div className="mt-5"><Alert>{error}</Alert></div>}

    {loading ? <p className="mt-8 flex items-center gap-2 text-muted"><Spinner /> Loading…</p>
      : requests.length === 0 ? <div className="mt-6"><EmptyState icon={Inbox} title="Inbox zero">New mentorship requests from the site land here.</EmptyState></div>
        : <div className="mt-6 space-y-3">
          {requests.map(request => <article key={request.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a href={`mailto:${request.email}`} className="font-semibold hover:text-lime">{request.userName || request.email}</a>
                  <StatusPill value={request.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {request.focus || 'No focus given'} · {formatDate(request.createdAt)}
                  {request.userName && ` · ${request.email}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select className="field !mt-0 w-auto py-1.5 text-xs" value={request.status} onChange={event => update(request, event.target.value)}>
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="closed">closed</option>
                </select>
                <a className="rounded-lg border border-line p-2 hover:text-lime" href={`mailto:${request.email}`} aria-label="Reply"><Mail size={15} /></a>
                <button className="rounded-lg border border-line p-2 hover:text-rose-500" onClick={() => remove(request)} aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
            {request.message && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed text-muted">{request.message}</p>}
          </article>)}
        </div>}
  </div>
}
