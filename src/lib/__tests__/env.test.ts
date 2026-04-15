import { describe, it, expect } from 'vitest'
import { env } from '../env'

describe('env', () => {
  it('exports env object with required keys', () => {
    expect(env).toHaveProperty('VITE_SUPABASE_URL')
    expect(env).toHaveProperty('VITE_SUPABASE_ANON_KEY')
  })

  it('has valid URL format for Supabase URL', () => {
    expect(env.VITE_SUPABASE_URL).toMatch(/^https:\/\//)
  })

  it('has non-empty anon key', () => {
    expect(env.VITE_SUPABASE_ANON_KEY.length).toBeGreaterThan(0)
  })
})
