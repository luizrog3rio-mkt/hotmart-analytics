/**
 * Hotmart Sync Service — Frontend
 *
 * Manages the connection state, triggers syncs via Edge Functions,
 * and provides status info for the UI.
 */

import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HotmartConnectionStatus {
  connected: boolean
  lastSyncAt: string | null
  tokenExpiresAt: string | null
}

export interface SyncResult {
  success: boolean
  sales_fetched?: number
  subscriptions_fetched?: number
  records_created?: number
  records_updated?: number
  error?: string
}

export interface SyncLogEntry {
  id: string
  sync_type: 'full' | 'incremental' | 'webhook'
  status: 'running' | 'completed' | 'failed'
  records_fetched: number
  records_created: number
  records_updated: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export async function getConnectionStatus(userId: string): Promise<HotmartConnectionStatus> {
  const { data } = await supabase
    .from('profiles')
    .select('hotmart_token, hotmart_last_sync_at, hotmart_token_expires_at')
    .eq('id', userId)
    .single()

  return {
    connected: !!data?.hotmart_token,
    lastSyncAt: data?.hotmart_last_sync_at || null,
    tokenExpiresAt: data?.hotmart_token_expires_at || null,
  }
}

// ---------------------------------------------------------------------------
// OAuth exchange via Edge Function
// ---------------------------------------------------------------------------

export async function connectHotmart(params: {
  code: string
  redirectUri: string
  clientId: string
  clientSecret: string
}): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase.functions.invoke('hotmart-oauth', {
    body: {
      action: 'exchange',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    },
  })

  if (error) return { success: false, error: error.message }
  return { success: data?.success || false, error: data?.error }
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

export async function disconnectHotmart(): Promise<{ success: boolean }> {
  const { error } = await supabase.functions.invoke('hotmart-oauth', {
    body: { action: 'disconnect' },
  })

  return { success: !error }
}

// ---------------------------------------------------------------------------
// Trigger sync
// ---------------------------------------------------------------------------

export async function triggerSync(mode: 'full' | 'incremental' = 'incremental'): Promise<SyncResult> {
  const { data, error } = await supabase.functions.invoke('hotmart-sync', {
    body: { mode },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: data?.success || false,
    sales_fetched: data?.sales_fetched,
    subscriptions_fetched: data?.subscriptions_fetched,
    records_created: data?.records_created,
    records_updated: data?.records_updated,
    error: data?.error,
  }
}

// ---------------------------------------------------------------------------
// Sync history
// ---------------------------------------------------------------------------

export async function getSyncHistory(userId: string, limit = 10): Promise<SyncLogEntry[]> {
  const { data } = await supabase
    .from('hotmart_sync_log')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)

  return (data || []) as SyncLogEntry[]
}

// ---------------------------------------------------------------------------
// Manual credential save (for users who prefer entering client_id/secret directly)
// ---------------------------------------------------------------------------

export async function saveHotmartCredentials(
  userId: string,
  clientId: string,
  clientSecret: string,
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      hotmart_client_id: clientId,
      hotmart_client_secret: clientSecret,
    })
    .eq('id', userId)

  return { success: !error }
}
