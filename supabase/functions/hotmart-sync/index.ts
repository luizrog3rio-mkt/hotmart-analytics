/**
 * Hotmart Sync Edge Function
 *
 * Fetches sales and subscriptions from the Hotmart API and upserts them
 * into Supabase. Supports full sync and incremental (since last sync).
 *
 * POST /hotmart-sync { mode: 'full' | 'incremental' }
 *
 * Can also be invoked by pg_cron for scheduled syncs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const HOTMART_API_BASE = 'https://developers.hotmart.com/payments/api/v1'
const HOTMART_OAUTH_URL = 'https://api-hot-connect.hotmart.com/oauth/token'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapStatus(s: string): string {
  const m: Record<string, string> = {
    APPROVED: 'approved', COMPLETE: 'approved', CANCELLED: 'cancelled',
    REFUNDED: 'refunded', CHARGEBACK: 'disputed', DISPUTE: 'disputed',
    WAITING_PAYMENT: 'pending', EXPIRED: 'cancelled', DELAYED: 'pending',
    OVERDUE: 'pending', PRINTED_BILLET: 'pending', NO_FUNDS: 'cancelled',
  }
  return m[s] || 'pending'
}

function mapPayment(t: string): string {
  const m: Record<string, string> = {
    CREDIT_CARD: 'credit_card', BILLET: 'boleto', PIX: 'pix',
    PAYPAL: 'paypal', GOOGLE_PAY: 'credit_card', APPLE_PAY: 'credit_card',
  }
  return m[t] || 'credit_card'
}

function mapSubStatus(s: string): string {
  const m: Record<string, string> = {
    ACTIVE: 'active', CANCELLED_BY_CUSTOMER: 'cancelled',
    CANCELLED_BY_SELLER: 'cancelled', CANCELLED_BY_ADMIN: 'cancelled',
    OVERDUE: 'past_due', EXPIRED: 'cancelled', TRIAL: 'trialing',
  }
  return m[s] || 'active'
}

async function ensureToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: { hotmart_token: string; hotmart_refresh_token: string; hotmart_token_expires_at: string; hotmart_client_id: string; hotmart_client_secret: string },
): Promise<string> {
  const expiresAt = new Date(profile.hotmart_token_expires_at)
  const now = new Date()

  // Token still valid (with 5 min buffer)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return profile.hotmart_token
  }

  // Refresh token
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: profile.hotmart_client_id,
    client_secret: profile.hotmart_client_secret,
    refresh_token: profile.hotmart_refresh_token,
  })

  const res = await fetch(HOTMART_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)

  const tokenData = await res.json()
  const newExpires = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  await supabase.from('profiles').update({
    hotmart_token: tokenData.access_token,
    hotmart_refresh_token: tokenData.refresh_token,
    hotmart_token_expires_at: newExpires,
  }).eq('id', userId)

  return tokenData.access_token
}

async function fetchPaginated(token: string, path: string, params: Record<string, string> = {}) {
  const allItems: unknown[] = []
  let pageToken: string | null = null

  do {
    const url = new URL(`${HOTMART_API_BASE}${path}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    if (pageToken) url.searchParams.set('page_token', pageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error(`Hotmart API ${path} error: ${res.status} ${await res.text()}`)

    const data = await res.json()
    allItems.push(...(data.items || []))
    pageToken = data.page_info?.next_page_token || null
  } while (pageToken)

  return allItems
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'incremental'

    // Get profile with Hotmart credentials
    const { data: profile } = await supabase
      .from('profiles')
      .select('hotmart_token, hotmart_refresh_token, hotmart_token_expires_at, hotmart_client_id, hotmart_client_secret, hotmart_last_sync_at')
      .eq('id', user.id)
      .single()

    if (!profile?.hotmart_token) {
      return new Response(
        JSON.stringify({ error: 'Hotmart not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('hotmart_sync_log')
      .insert({ user_id: user.id, sync_type: mode, status: 'running' })
      .select('id')
      .single()

    const syncId = syncLog?.id

    try {
      const accessToken = await ensureToken(supabase, user.id, profile)

      // Determine date range
      const salesParams: Record<string, string> = {}
      if (mode === 'incremental' && profile.hotmart_last_sync_at) {
        salesParams.start_date = new Date(profile.hotmart_last_sync_at).getTime().toString()
      } else {
        // Full sync: last 365 days
        salesParams.start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime().toString()
      }
      salesParams.end_date = Date.now().toString()

      // Fetch data from Hotmart
      const [sales, subscriptions] = await Promise.all([
        fetchPaginated(accessToken, '/sales/history', salesParams),
        fetchPaginated(accessToken, '/subscriptions'),
      ])

      let recordsCreated = 0
      let recordsUpdated = 0

      // Process products (deduplicate by hotmart product id)
      const productMap = new Map<string, string>()
      const uniqueProducts = new Map<string, { name: string; ucode: string; price: number }>()

      for (const sale of sales as Array<{ product: { name: string; ucode: string }; purchase: { price: { value: number } } }>) {
        if (!uniqueProducts.has(sale.product.ucode)) {
          uniqueProducts.set(sale.product.ucode, {
            name: sale.product.name,
            ucode: sale.product.ucode,
            price: sale.purchase.price.value,
          })
        }
      }

      // Fetch existing products
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, hotmart_product_id')
        .eq('user_id', user.id)

      for (const ep of existingProducts || []) {
        if (ep.hotmart_product_id) productMap.set(ep.hotmart_product_id, ep.id)
      }

      // Create missing products
      for (const [ucode, info] of uniqueProducts) {
        if (!productMap.has(ucode)) {
          const { data: newProd } = await supabase
            .from('products')
            .insert({
              user_id: user.id,
              hotmart_product_id: ucode,
              name: info.name,
              price: info.price,
              type: 'digital' as const,
              status: 'active' as const,
            })
            .select('id')
            .single()

          if (newProd) {
            productMap.set(ucode, newProd.id)
            recordsCreated++
          }
        }
      }

      // Process affiliates
      const affiliateMap = new Map<string, string>()
      const { data: existingAffiliates } = await supabase
        .from('affiliates')
        .select('id, hotmart_affiliate_id')
        .eq('user_id', user.id)

      for (const ea of existingAffiliates || []) {
        if (ea.hotmart_affiliate_id) affiliateMap.set(ea.hotmart_affiliate_id, ea.id)
      }

      for (const sale of sales as Array<{ affiliate?: { affiliate_code: string; name: string } }>) {
        if (sale.affiliate && !affiliateMap.has(sale.affiliate.affiliate_code)) {
          const { data: newAff } = await supabase
            .from('affiliates')
            .insert({
              user_id: user.id,
              hotmart_affiliate_id: sale.affiliate.affiliate_code,
              name: sale.affiliate.name,
              email: '',
              commission_rate: 0,
            })
            .select('id')
            .single()

          if (newAff) {
            affiliateMap.set(sale.affiliate.affiliate_code, newAff.id)
            recordsCreated++
          }
        }
      }

      // Process transactions in batches
      const BATCH_SIZE = 200
      for (let i = 0; i < sales.length; i += BATCH_SIZE) {
        const batch = (sales as Array<{
          purchase: { transaction: string; status: string; order_date: number; price: { value: number }; payment: { type: string }; commission?: { value: number }; tracking: { source: string; source_sck: string } }
          product: { ucode: string }
          buyer: { name: string; email: string }
          affiliate?: { affiliate_code: string }
        }>).slice(i, i + BATCH_SIZE)

        const rows = batch.map(sale => {
          const productId = productMap.get(sale.product.ucode)
          if (!productId) return null

          const hasAffiliate = !!sale.affiliate
          const hasUtm = !!(sale.purchase.tracking?.source || sale.purchase.tracking?.source_sck)
          let source: 'organic' | 'affiliate' | 'campaign' = 'organic'
          if (hasAffiliate) source = 'affiliate'
          else if (hasUtm) source = 'campaign'

          return {
            user_id: user.id,
            product_id: productId,
            buyer_email: sale.buyer.email,
            buyer_name: sale.buyer.name,
            amount: sale.purchase.price.value,
            net_amount: sale.purchase.price.value - (sale.purchase.commission?.value || 0),
            status: mapStatus(sale.purchase.status) as 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending',
            payment_method: mapPayment(sale.purchase.payment.type) as 'credit_card' | 'boleto' | 'pix' | 'paypal',
            source,
            utm_source: sale.purchase.tracking?.source || null,
            utm_campaign: sale.purchase.tracking?.source_sck || null,
            affiliate_id: sale.affiliate ? (affiliateMap.get(sale.affiliate.affiliate_code) || null) : null,
            created_at: new Date(sale.purchase.order_date).toISOString(),
          }
        }).filter(Boolean)

        if (rows.length > 0) {
          const { data: inserted } = await supabase
            .from('transactions')
            .upsert(rows as NonNullable<(typeof rows)[number]>[], { onConflict: 'id' })
            .select('id')

          recordsCreated += inserted?.length || 0
        }
      }

      // Process subscriptions
      for (const sub of subscriptions as Array<{
        subscription_id: number; status: string; product: { ucode: string }; subscriber: { name: string; email: string }
        accession_date: number; end_accession_date: number | null; date_next_charge: number | null
      }>) {
        const productId = productMap.get(sub.product.ucode)
        if (!productId) continue

        const { error: subErr } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            product_id: productId,
            buyer_email: sub.subscriber.email,
            status: mapSubStatus(sub.status) as 'active' | 'cancelled' | 'past_due' | 'trialing',
            started_at: new Date(sub.accession_date).toISOString(),
            cancelled_at: sub.end_accession_date ? new Date(sub.end_accession_date).toISOString() : null,
            next_billing: sub.date_next_charge ? new Date(sub.date_next_charge).toISOString() : null,
          })

        if (!subErr) recordsUpdated++
      }

      // Update sync timestamp & log
      await supabase.from('profiles').update({ hotmart_last_sync_at: new Date().toISOString() }).eq('id', user.id)

      if (syncId) {
        await supabase.from('hotmart_sync_log').update({
          status: 'completed',
          records_fetched: sales.length + subscriptions.length,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          completed_at: new Date().toISOString(),
        }).eq('id', syncId)
      }

      // Recalculate daily metrics
      await supabase.rpc('recalculate_metrics', { p_user_id: user.id })

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          sales_fetched: sales.length,
          subscriptions_fetched: subscriptions.length,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (syncErr) {
      // Update sync log with error
      if (syncId) {
        await supabase.from('hotmart_sync_log').update({
          status: 'failed',
          error_message: syncErr instanceof Error ? syncErr.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        }).eq('id', syncId)
      }
      throw syncErr
    }
  } catch (err) {
    console.error('hotmart-sync error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
