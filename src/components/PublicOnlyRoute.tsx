import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}
