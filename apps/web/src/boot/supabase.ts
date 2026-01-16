/**
 * Supabase Client Boot File
 */
import { boot } from 'quasar/wrappers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);

// Create a mock supabase client for development without credentials
const createMockClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: new Error('Supabase not configured') }),
      update: () => ({ data: null, error: new Error('Supabase not configured') }),
      delete: () => ({ data: null, error: new Error('Supabase not configured') }),
    }),
  } as unknown as SupabaseClient;
};

// Create Supabase client (or mock if not configured)
export const supabase = hasSupabaseCredentials
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createMockClient();

// Log warning if using mock client
if (!hasSupabaseCredentials) {
  devWarn('[Supabase] No credentials configured. Using mock client for development.');
}

export default boot(({ app, router }): void => {
  // Provide Supabase client globally
  app.provide('supabase', supabase);

  // Add navigation guard for protected routes
  router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

    if (requiresAuth) {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Redirect to login with return URL
        next({
          name: 'login',
          query: { redirect: to.fullPath },
        });
        return;
      }
    }

    next();
  });
});
