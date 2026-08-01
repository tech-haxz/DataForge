import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Field, Spinner } from '../components/ui'
import Reveal from '../components/Reveal'

export default function Signup() {
  const { signup, user } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const submit = async event => {
    event.preventDefault()
    setError('')
    setDetails({})
    if (form.password !== form.confirm) return setDetails({ confirm: 'Passwords do not match' })

    setBusy(true)
    try {
      await signup(form.name, form.email, form.password)
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
        <div className="icon-box"><UserPlus size={20} /></div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Start building.</h1>
        <p className="mt-2 text-sm text-muted">Free account. Enroll in a cohort whenever you are ready.</p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <Field label="Your name" error={details.name}>
            <input className="field" value={form.name} onChange={set('name')} autoComplete="name" required />
          </Field>
          <Field label="Email" error={details.email}>
            <input className="field" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          </Field>
          <Field label="Password" hint="8+ characters" error={details.password}>
            <input className="field" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Confirm password" error={details.confirm}>
            <input className="field" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
          </Field>
          <button className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? <Spinner /> : <>Create account <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-semibold text-lime">Sign in</Link>
        </p>
      </div>
    </Reveal>
  </div>
}
