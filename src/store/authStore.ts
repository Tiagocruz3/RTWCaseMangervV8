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
      
      // ✅ Get session with better error handling
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth] Session error:', sessionError);
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        return;
      }
      
      console.log('[Auth] Session:', session);
      
      if (session?.user) {
        console.log('[Auth] Session user found, fetching profile...');
        try {
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
            
            // ✅ Set up auth listener ONLY after successful initialization
            setupAuthListener();
            return;
          } else {
            console.log('[Auth] No profile found for user.');
          }
        } catch (profileError) {
          console.error('[Auth] Profile fetch error:', profileError);
        }
      } else {
        console.log('[Auth] No session user found.');
      }
      
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
      console.log('[Auth] Initialization complete, no authenticated user.');
      
      // ✅ Set up auth listener even if no user (for future login events)
      setupAuthListener();
      
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

// ✅ FIXED: Move auth listener setup to a function that's called after initialization
let authListenerSetup = false;

function setupAuthListener() {
  // ✅ Prevent multiple listeners
  if (authListenerSetup) return;
  authListenerSetup = true;
  
  console.log('[Auth] Setting up auth state listener...');
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] Auth state change:', event, session?.user?.id);
    
    const state = useAuthStore.getState();
    
    // ✅ Prevent conflicts during initialization
    if (state.isLoading) {
      console.log('[Auth] Skipping auth state change during initialization');
      return;
    }
    
    if (event === 'SIGNED_OUT' || !session) {
      console.log('[Auth] User signed out');
      useAuthStore.setState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null 
      })
    } else if (event === 'SIGNED_IN' && session && !state.isAuthenticated) {
      console.log('[Auth] User signed in, fetching profile...');
      try {
        const profile = await supabaseService.getCurrentUser()
        
        if (profile) {
          useAuthStore.setState({
            user: createUser(profile),
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          console.log('[Auth] Profile updated from auth state change');
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        useAuthStore.setState({ 
          isLoading: false,
          error: 'Authentication state change failed'
        })
      }
    }
  });
  
  // ✅ Cleanup function (optional, for if you need to reset)
  return () => {
    subscription.unsubscribe();
    authListenerSetup = false;
  };
}
