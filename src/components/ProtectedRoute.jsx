import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function LoadingScreen({ label = 'Loading' }) {
  return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-muted">
    <Loader2 className="animate-spin" size={20} /> {label}…
  </div>
}

/** Gate for signed-in routes. Pass `staff` or `admin` to narrow it further. */
export default function ProtectedRoute({ children, staff = false, admin = false }) {
  const { user, loading, isStaff, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen label="Checking your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />
  if (staff && !isStaff) return <Navigate to="/dashboard" replace />
  return children
}
