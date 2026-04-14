import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

function getEnv() {
  const parsed = envSchema.safeParse(import.meta.env)
  if (!parsed.success) {
    console.warn(
      'Missing environment variables. Using demo mode.',
      parsed.error.flatten().fieldErrors,
    )
    return {
      VITE_SUPABASE_URL: 'https://demo.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'demo-key',
    }
  }
  return parsed.data
}

export const env = getEnv()
