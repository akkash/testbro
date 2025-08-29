import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User } from '@/lib/supabase'
import { Session, AuthError } from '@supabase/supabase-js'
import { apiClient } from '../lib/api'

// Enhanced AuthState interface
export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  token: string | null
  lastError: string | null
  isTokenExpiring: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signInWithGithub: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
  // API Key management for programmatic access
  createApiKey: (name: string, permissions?: string[]) => Promise<{ data?: any; error?: string }>
  listApiKeys: () => Promise<{ data?: any[]; error?: string }>
  revokeApiKey: (keyId: string) => Promise<{ error?: string }>
  // Enhanced user profile management
  getUserProfile: () => Promise<{ data?: any; error?: string }>
  updateUserProfile: (updates: any) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isTokenExpiring, setIsTokenExpiring] = useState(false)

  const isAuthenticated = !!user && !!session

  // Clear error helper
  const clearError = () => setLastError(null)

  // Check token expiration
  const checkTokenExpiration = (session: Session) => {
    if (!session.expires_at) return
    
    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    setIsTokenExpiring((expiresAt - now) < fiveMinutes)
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setLastError(error.message)
          return
        }
        
        if (session) {
          setSession(session)
          setUser(session.user as User)
          setToken(session.access_token)
          checkTokenExpiration(session)
          
          // Store token for API calls
          localStorage.setItem('sb-token', session.access_token)
          
          // Verify token with backend and get user profile
          try {
            const userProfile = await apiClient.get('/api/auth/me')
            console.log('User profile loaded:', userProfile)
            clearError() // Clear any previous errors
          } catch (error) {
            console.error('Failed to load user profile:', error)
            const errorMsg = error instanceof Error ? error.message : 'Failed to verify with backend'
            setLastError(errorMsg)
            
            // If backend verification fails, we might want to sign out
            if ((error as any)?.status === 401) {
              console.warn('Backend authentication failed, signing out...')
              await supabase.auth.signOut()
            }
          }
        } else {
          // No session, clear any stored tokens
          localStorage.removeItem('sb-token')
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setLastError(error instanceof Error ? error.message : 'Session initialization failed')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        try {
          setSession(session)
          setUser(session?.user as User || null)
          setToken(session?.access_token || null)
          
          if (session) {
            checkTokenExpiration(session)
            
            // Store token for API calls
            localStorage.setItem('sb-token', session.access_token)
            
            // Verify with backend
            try {
              const userProfile = await apiClient.get('/api/auth/me')
              console.log('User profile verified:', userProfile)
              clearError() // Clear any previous errors
            } catch (error) {
              console.error('Backend verification failed:', error)
              const errorMsg = error instanceof Error ? error.message : 'Backend verification failed'
              setLastError(errorMsg)
            }
          } else {
            // Clear stored token and state
            localStorage.removeItem('sb-token')
            setIsTokenExpiring(false)
            clearError()
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          setLastError(error instanceof Error ? error.message : 'Authentication state error')
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const refreshToken = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      if (data.session) {
        setSession(data.session)
        setToken(data.session.access_token)
        localStorage.setItem('sb-token', data.session.access_token)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      await signOut()
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      // Backend will receive the JWT token automatically via our API client
      return {}
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      console.error('Google sign in error:', error)
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGithub = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      console.error('GitHub sign in error:', error)
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      
      // Clear local state
      setUser(null)
      setSession(null)
      setToken(null)
      localStorage.removeItem('sb-token')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  // API Key management functions
  const createApiKey = async (name: string, permissions: string[] = []) => {
    try {
      const data = await apiClient.post('/api/api-keys', {
        name,
        permissions,
        expiresAt: null, // No expiration by default
        rateLimit: {
          requests: 1000,
          period: 'hour'
        }
      })
      return { data }
    } catch (error) {
      console.error('Failed to create API key:', error)
      return { error: error instanceof Error ? error.message : 'Failed to create API key' }
    }
  }

  const listApiKeys = async () => {
    try {
      const data = await apiClient.get('/api/api-keys')
      return { data: data.data }
    } catch (error) {
      console.error('Failed to list API keys:', error)
      return { error: error instanceof Error ? error.message : 'Failed to list API keys' }
    }
  }

  const revokeApiKey = async (keyId: string) => {
    try {
      await apiClient.delete(`/api/api-keys/${keyId}`)
      return {}
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      return { error: error instanceof Error ? error.message : 'Failed to revoke API key' }
    }
  }

  // Enhanced user profile management
  const getUserProfile = async () => {
    try {
      const data = await apiClient.get('/api/auth/me')
      clearError()
      return { data }
    } catch (error) {
      console.error('Failed to get user profile:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to get user profile'
      setLastError(errorMsg)
      return { error: errorMsg }
    }
  }

  const updateUserProfile = async (updates: any) => {
    try {
      await apiClient.put('/api/auth/profile', updates)
      clearError()
      return {}
    } catch (error) {
      console.error('Failed to update user profile:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to update user profile'
      setLastError(errorMsg)
      return { error: errorMsg }
    }
  }

  const value: AuthState = {
    user,
    session,
    loading,
    isAuthenticated,
    token,
    lastError,
    isTokenExpiring,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGithub,
    signOut,
    refreshToken,
    clearError,
    createApiKey,
    listApiKeys,
    revokeApiKey,
    getUserProfile,
    updateUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}