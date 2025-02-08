import { createClient } from '@supabase/supabase-js'

console.log('Initializing Supabase with URL:', process.env.REACT_APP_SUPABASE_URL ? 'URL exists' : 'URL missing');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Test the connection
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event, 'Session:', session ? 'exists' : 'null');
}); 