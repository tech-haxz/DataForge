import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Trash2, UserCog } from 'lucide-react'
import { api, formatDate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Alert, EmptyState, Field, Modal, Spinner, StatusPill } from '../../components/ui'

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [data, setData] = useState({ users: [], total: 0, page: 1, pages: 1 })
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api(`/users?search=${encodeURIComponent(search)}&role=${role}&page=${page}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [search, role, page])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const patch = async (user, body) => {
    setError('')
    try {
      await api(`/users/${user.id}`, { method: 'PATCH', body })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async user => {
    if (!confirm(`Delete ${user.email}? Their enrollments and progress go with them.`)) return
    setError('')
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return <div>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Members</h2>
        <p className="text-sm text-muted">{data.total} accounts</p>
      </div>
      <button className="btn-primary px-4 py-2 text-sm" onClick={() => setCreating(true)}><Plus size={16} /> Add member</button>
    </header>

    <div className="mt-6 flex flex-wrap gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="field !mt-0 pl-11"
          placeholder="Search by name or email"
          value={search}
          onChange={event => { setPage(1); setSearch(event.target.value) }}
        />
      </div>
      <select className="field !mt-0 w-auto" value={role} onChange={event => { setPage(1); setRole(event.target.value) }}>
        <option value="all">All roles</option>
        <option value="student">Students</option>
        <option value="instructor">Instructors</option>
        <option value="admin">Admins</option>
      </select>
    </div>

    {error && <div className="mt-5"><Alert>{error}</Alert></div>}

    {loading ? <p className="mt-8 flex items-center gap-2 text-muted"><Spinner /> Loading…</p>
      : data.users.length === 0 ? <div className="mt-6"><EmptyState icon={UserCog} title="No members match that filter" /></div>
        : <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-muted">
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Courses</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {data.users.map(user => <tr key={user.id} className="border-b border-line/60">
                <td className="py-4 pr-4">
                  <div className="font-semibold">{user.name}{user.id === me.id && <span className="ml-2 text-xs text-lime">you</span>}</div>
                  <div className="text-muted">{user.email}</div>
                </td>
                <td className="py-4 pr-4">
                  <select
                    className="field !mt-0 w-auto py-1.5 text-xs"
                    value={user.role}
                    disabled={user.id === me.id}
                    onChange={event => patch(user, { role: event.target.value })}
                  >
                    <option value="student">student</option>
                    <option value="instructor">instructor</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="py-4 pr-4">
                  <button
                    onClick={() => patch(user, { status: user.status === 'active' ? 'suspended' : 'active' })}
                    disabled={user.id === me.id}
                    title={user.status === 'active' ? 'Suspend this account' : 'Reactivate this account'}
                    className="disabled:opacity-50"
                  >
                    <StatusPill value={user.status} />
                  </button>
                </td>
                <td className="py-4 pr-4 text-muted">{user.enrollments}</td>
                <td className="py-4 pr-4 text-muted">{formatDate(user.createdAt)}</td>
                <td className="py-4 text-right">
                  <button
                    className="rounded-lg border border-line p-2 hover:text-rose-500 disabled:opacity-40"
                    onClick={() => remove(user)}
                    disabled={user.id === me.id}
                    aria-label="Delete"
                  ><Trash2 size={15} /></button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}

    {data.pages > 1 && <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <button className="btn-ghost border border-line px-4 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
      <span className="text-muted">Page {data.page} of {data.pages}</span>
      <button className="btn-ghost border border-line px-4 py-2 disabled:opacity-40" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next</button>
    </div>}

    {creating && <CreateUser onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </div>
}

function CreateUser({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
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
      await api('/users', { method: 'POST', body: form })
      onSaved()
    } catch (err) {
      setError(err.message)
      setDetails(err.details || {})
    } finally {
      setBusy(false)
    }
  }

  return <Modal title="Add a member" onClose={onClose}>
    <form className="space-y-4" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <Field label="Name" error={details.name}><input className="field" value={form.name} onChange={set('name')} required /></Field>
      <Field label="Email" error={details.email}><input className="field" type="email" value={form.email} onChange={set('email')} required /></Field>
      <Field label="Temporary password" hint="8+ characters" error={details.password}>
        <input className="field" type="text" value={form.password} onChange={set('password')} minLength={8} required />
      </Field>
      <Field label="Role" error={details.role}>
        <select className="field" value={form.role} onChange={set('role')}>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <div className="flex gap-3 pt-2">
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Create account'}</button>
        <button type="button" className="btn-ghost border border-line" onClick={onClose}>Cancel</button>
      </div>
    </form>
  </Modal>
}
