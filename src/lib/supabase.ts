console.log('[Supabase] Initializing supabase client...');
console.log('[Supabase] URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('[Supabase] ANON KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing');
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Storage bucket names
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'case-documents',
  AVATARS: 'avatars',
  REPORTS: 'reports'
} as const