import { renderHook } from '@testing-library/react'
import { useRequireRole, useCanViewAllRecords, useIsAdmin } from '../hooks'
import { useAuth } from '../context'

// Mock the useAuth hook
jest.mock('../context', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('Auth Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useRequireRole', () => {
    it('should return hasAccess true when user has required role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'admin', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useRequireRole(['admin', 'supervisor']))
      
      expect(result.current.hasAccess).toBe(true)
      expect(result.current.loading).toBe(false)
      expect(result.current.role).toBe('admin')
    })

    it('should return hasAccess false when user does not have required role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'worker', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useRequireRole(['admin', 'supervisor']))
      
      expect(result.current.hasAccess).toBe(false)
      expect(result.current.loading).toBe(false)
      expect(result.current.role).toBe('worker')
    })

    it('should return loading true when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useRequireRole(['admin']))
      
      expect(result.current.hasAccess).toBe(false)
      expect(result.current.loading).toBe(true)
      expect(result.current.role).toBe(null)
    })
  })

  describe('useIsAdmin', () => {
    it('should return isAdmin true for admin role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'admin', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useIsAdmin())
      
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.loading).toBe(false)
    })

    it('should return isAdmin false for non-admin role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'worker', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useIsAdmin())
      
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.loading).toBe(false)
    })
  })

  describe('useCanViewAllRecords', () => {
    it('should return canViewAll true for supervisor role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'supervisor', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useCanViewAllRecords())
      
      expect(result.current.canViewAll).toBe(true)
      expect(result.current.loading).toBe(false)
    })

    it('should return canViewAll true for engineer role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'engineer', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useCanViewAllRecords())
      
      expect(result.current.canViewAll).toBe(true)
      expect(result.current.loading).toBe(false)
    })

    it('should return canViewAll false for worker role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user' } as any,
        profile: { id: 'test-user', role: 'worker', station: null, created_at: '', updated_at: '' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithMagicLink: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      })

      const { result } = renderHook(() => useCanViewAllRecords())
      
      expect(result.current.canViewAll).toBe(false)
      expect(result.current.loading).toBe(false)
    })
  })
})