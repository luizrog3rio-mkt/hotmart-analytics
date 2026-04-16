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
      // Disable Navigator Lock API to prevent conflicts with multiple tabs/previews
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
    },
  },
)
