import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from './env'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: 'hotmart-analytics-auth',
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      // Disable Navigator Lock API to avoid multi-tab deadlocks. Must be generic
      // to match LockFunc = <R>(...) => Promise<R> — a non-generic signature
      // degrades the client type and breaks type inference across the app.
      lock: <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
    },
  },
)
