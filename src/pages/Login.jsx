import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Field, Spinner } from '../components/ui'
import Reveal from '../components/Reveal'

export default function Login() {
  const { login, user } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(false)

  // Signing in re-renders this page with a user, so the redirect lives here —
  // staff land in the admin panel, everyone else on their dashboard.
  if (user) {
    const home = user.role === 'student' ? '/dashboard' : '/admin'
    return <Navigate to={location.state?.from || home} replace />
  }

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setDetails({})
    try {
      await login(form.email, form.password)
    } catch (err) {
      setError(err.message)
      setDetails(err.details || {})
    } finally {
      setBusy(false)
    }
  }

  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))

  return <div className="container flex justify-center pb-24 pt-36">
    <Reveal>
      <div className="card w-full max-w-md">
        <div className="icon-box"><LogIn size={20} /></div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Welcome back.</h1>
        <p className="mt-2 text-sm text-muted">Pick up where you left off.</p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <Field label="Email" error={details.email}>
            <input className="field" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Password" error={details.password}>
            <input className="field" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} required />
          </Field>
          <button className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? <Spinner /> : <>Sign in <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New here? <Link to="/signup" className="font-semibold text-lime">Create an account</Link>
        </p>
      </div>
    </Reveal>
  </div>
}
