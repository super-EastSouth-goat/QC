'use client'

import { useAuth } from './context'
import { UserRole } from '@/lib/types'

export function useUser() {
  const { user, loading } = useAuth()
  return { user, loading }
}

export function useProfile() {
  const { profile, loading, refreshProfile } = useAuth()
  return { profile, loading, refreshProfile }
}

export function useSession() {
  const { session, loading } = useAuth()
  return { session, loading }
}

export function useAuthActions() {
  const { signIn, signUp, signInWithMagicLink, signOut } = useAuth()
  return { signIn, signUp, signInWithMagicLink, signOut }
}

export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return { user: null, loading: true, isAuthenticated: false }
  }
  
  return {
    user,
    loading: false,
    isAuthenticated: !!user,
  }
}

export function useRequireRole(requiredRoles: UserRole[]) {
  const { profile, loading } = useAuth()
  
  if (loading) {
    return { hasAccess: false, loading: true, role: null }
  }
  
  // If no roles are required, access is granted
  if (!requiredRoles || requiredRoles.length === 0) {
    return {
      hasAccess: true,
      loading: false,
      role: profile?.role || null,
    }
  }
  
  const hasAccess = profile ? requiredRoles.includes(profile.role) : false
  
  return {
    hasAccess,
    loading: false,
    role: profile?.role || null,
  }
}

export function useIsAdmin() {
  const { profile, loading } = useAuth()
  
  if (loading) {
    return { isAdmin: false, loading: true }
  }
  
  return {
    isAdmin: profile?.role === 'admin',
    loading: false,
  }
}

export function useCanViewAllRecords() {
  const { profile, loading } = useAuth()
  
  if (loading) {
    return { canViewAll: false, loading: true }
  }
  
  const canViewAll = profile ? ['supervisor', 'engineer', 'admin'].includes(profile.role) : false
  
  return {
    canViewAll,
    loading: false,
  }
}