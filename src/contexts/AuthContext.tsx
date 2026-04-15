import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: string
  onboarding_completed: boolean
  onboarding_step: number
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  isDemoMode: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Demo helpers
// ---------------------------------------------------------------------------

const DEMO_MODE = env.VITE_SUPABASE_URL === 'https://demo.supabase.co'

const DEMO_USER: User = {
  id: 'demo-user-000',
  app_metadata: {},
  user_metadata: { full_name: 'Usu\u00e1rio Demo' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User

const DEMO_PROFILE: Profile = {
  id: 'demo-user-000',
  email: 'demo@hotmart-analytics.local',
  full_name: 'Usu\u00e1rio Demo',
  avatar_url: null,
  plan: 'pro',
  onboarding_completed: true,
  onboarding_step: 4,
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!DEMO_MODE)

  // -- Fetch profile --------------------------------------------------------

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, plan, onboarding_completed')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error.message)
      return null
    }

    const profileData: Profile = {
      ...data,
      full_name: data.full_name ?? null,
      avatar_url: data.avatar_url ?? null,
      onboarding_step: data.onboarding_completed ? 4 : 0,
    }

    return profileData
  }, [])

  // -- Auth state listener --------------------------------------------------

  useEffect(() => {
    if (DEMO_MODE) {
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      setLoading(false)
      return
    }

    let mounted = true

    // Safety timeout — never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth loading timeout — forcing loaded state')
        setLoading(false)
      }
    }, 5000)

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const p = await fetchProfile(currentUser.id)
          if (mounted) setProfile(p)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          try {
            const p = await fetchProfile(currentUser.id)
            if (mounted) setProfile(p)
          } catch {
            // profile fetch failed, continue with null
          }
        } else {
          setProfile(null)
        }
      },
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // -- Actions --------------------------------------------------------------

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error

      // Create initial profile row
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          plan: 'free',
          onboarding_completed: false,
        })
      }
    },
    [],
  )

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (DEMO_MODE) {
      // In demo mode just reset local state
      setUser(null)
      setProfile(null)
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  // -- Memoised value -------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isDemoMode: DEMO_MODE,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signInWithMagicLink,
      signOut,
    }),
    [user, profile, loading, signIn, signUp, signInWithMagicLink, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return ctx
}
