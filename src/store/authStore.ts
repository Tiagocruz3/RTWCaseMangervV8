import { create } from 'zustand'
import { User } from '../types'
import { supabaseService } from '../services/supabaseService'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
  clearError: () => void
}

const createUser = (profile: any): User => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  avatar: profile.avatar_url || undefined
})

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    
    try {
      const { user: authUser } = await supabaseService.signIn(email, password)
      
      if (!authUser) {
        throw new Error('Authentication failed')
      }

      const profile = await supabaseService.getCurrentUser()
      
      if (!profile) {
        throw new Error('Profile not found')
      }

      set({
        user: createUser(profile),
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({ isLoading: false, error: message })
      throw error
    }
  },
  
  logout: async () => {
    try {
      await supabaseService.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  initialize: async () => {
    const state = get()
    if (state.isLoading) return
    
    set({ isLoading: true, error: null })
    
    try {
      console.log('[Auth] Initializing...');
      let session;
      try {
        const result = await supabase.auth.getSession();
        session = result.data.session;
        console.log('[Auth] Session:', session);
      } catch (err) {
        console.error('[Auth] getSession error:', err);
        set({ user: null, isAuthenticated: false, isLoading: false, error: 'Failed to get session' });
        return;
      }
      
      if (session?.user) {
        console.log('[Auth] Session user found, fetching profile...');
        const profile = await supabaseService.getCurrentUser();
        console.log('[Auth] Profile:', profile);
        
        if (profile) {
          set({
            user: createUser(profile),
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          console.log('[Auth] Initialization complete, user authenticated.');
          return
        } else {
          console.log('[Auth] No profile found for user.');
        }
      } else {
        console.log('[Auth] No session user found.');
      }
      
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
      console.log('[Auth] Initialization complete, no authenticated user.');
    } catch (error) {
      console.error('[Auth] Auth initialization error:', error)
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: 'Failed to initialize authentication'
      })
    }
  },

  clearError: () => set({ error: null })
}))

// Auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const state = useAuthStore.getState()
  
  if (event === 'SIGNED_OUT' || !session) {
    useAuthStore.setState({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false,
      error: null 
    })
  } else if (event === 'SIGNED_IN' && session && !state.isAuthenticated) {
    try {
      const profile = await supabaseService.getCurrentUser()
      
      if (profile) {
        useAuthStore.setState({
          user: createUser(profile),
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Auth state change error:', error)
      useAuthStore.setState({ 
        isLoading: false,
        error: 'Authentication state change failed'
      })
    }
  }
})