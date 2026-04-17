/**
 * Hotmart Webhook Edge Function
 *
 * Receives real-time events from Hotmart (sale, refund, chargeback, subscription).
 * Hotmart sends POST requests to this endpoint when events occur.
 *
 * POST /hotmart-webhook
 *
 * The webhook URL is configured in the Hotmart developer portal.
 * Uses a shared secret (hottok) for authentication.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

function mapStatus(s: string): 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending' {
  const m: Record<string, 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending'> = {
    APPROVED: 'approved', COMPLETE: 'approved', CANCELLED: 'cancelled',
    REFUNDED: 'refunded', CHARGEBACK: 'disputed', DISPUTE: 'disputed',
    WAITING_PAYMENT: 'pending', EXPIRED: 'cancelled',
  }
  return m[s] || 'pending'
}

function mapPayment(t: string): 'credit_card' | 'boleto' | 'pix' | 'paypal' {
  const m: Record<string, 'credit_card' | 'boleto' | 'pix' | 'paypal'> = {
    CREDIT_CARD: 'credit_card', BILLET: 'boleto', PIX: 'pix', PAYPAL: 'paypal',
  }
  return m[t] || 'credit_card'
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Validate hottok against the configured secret
    const expectedHottok = Deno.env.get('HOTMART_HOTTOK')
    const receivedHottok = body.hottok
    if (!expectedHottok || receivedHottok !== expectedHottok) {
      console.warn('Webhook rejected: invalid hottok')
      return new Response(JSON.stringify({ error: 'Invalid hottok' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const event = body.event || body.status
    const data = body.data || body

    // Extract product ucode to find the user
    const productUcode = data.product?.ucode || data.prod?.ucode
    if (!productUcode) {
      return new Response(JSON.stringify({ error: 'Missing product identifier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find product owner
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, user_id')
      .eq('hotmart_product_id', productUcode)
      .limit(1)
      .single()

    if (!product) {
      // Product not yet imported — acknowledge but don't process
      console.log('Webhook for unknown product:', productUcode)
      return new Response(JSON.stringify({ ok: true, message: 'Product not tracked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = product.user_id
    const buyerEmail = data.buyer?.email || data.email || 'unknown@webhook.com'
    const buyerName = data.buyer?.name || data.name || 'Webhook User'
    const amount = data.purchase?.price?.value || data.price?.value || 0
    const transactionCode = data.purchase?.transaction || data.transaction || ''
    const paymentType = data.purchase?.payment?.type || data.payment_type || 'CREDIT_CARD'
    const status = data.purchase?.status || data.status || event

    // Determine source
    const hasAffiliate = !!data.affiliate
    const source: 'organic' | 'affiliate' | 'campaign' = hasAffiliate ? 'affiliate' : 'organic'

    // Handle affiliate
    let affiliateId: string | null = null
    if (data.affiliate?.affiliate_code) {
      const { data: existingAff } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('user_id', userId)
        .eq('hotmart_affiliate_id', data.affiliate.affiliate_code)
        .single()

      if (existingAff) {
        affiliateId = existingAff.id
      } else {
        const { data: newAff } = await supabaseAdmin
          .from('affiliates')
          .insert({
            user_id: userId,
            hotmart_affiliate_id: data.affiliate.affiliate_code,
            name: data.affiliate.name || 'Unknown',
            email: '',
            commission_rate: 0,
          })
          .select('id')
          .single()
        affiliateId = newAff?.id || null
      }
    }

    // Insert or update transaction
    const mappedStatus = mapStatus(status)

    // Check if transaction already exists (by looking at buyer_email + amount + close date)
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('buyer_email', buyerEmail)
      .eq('amount', amount)
      .eq('product_id', product.id)
      .limit(1)
      .maybeSingle()

    if (existingTx) {
      // Update existing transaction status
      await supabaseAdmin
        .from('transactions')
        .update({ status: mappedStatus })
        .eq('id', existingTx.id)
    } else {
      // Insert new transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userId,
          product_id: product.id,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          amount,
          net_amount: amount * 0.9,
          status: mappedStatus,
          payment_method: mapPayment(paymentType),
          source,
          affiliate_id: affiliateId,
          created_at: data.purchase?.order_date
            ? new Date(data.purchase.order_date).toISOString()
            : new Date().toISOString(),
        })
    }

    // Handle refund events
    if (['PURCHASE_REFUNDED', 'REFUNDED'].includes(event) && existingTx) {
      await supabaseAdmin
        .from('refunds')
        .insert({
          user_id: userId,
          transaction_id: existingTx.id,
          amount,
          reason: 'Hotmart webhook refund',
          requested_at: new Date().toISOString(),
        })
    }

    // Handle subscription events
    if (event === 'SUBSCRIPTION_CANCELLATION' && data.subscription) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled' as const,
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('buyer_email', buyerEmail)
        .eq('product_id', product.id)
        .eq('status', 'active')
    }

    // Log the sync event
    await supabaseAdmin
      .from('hotmart_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'webhook',
        status: 'completed',
        records_fetched: 1,
        records_created: existingTx ? 0 : 1,
        records_updated: existingTx ? 1 : 0,
        completed_at: new Date().toISOString(),
      })

    console.log(`Webhook processed: ${event} for user ${userId}, tx: ${transactionCode}`)

    return new Response(
      JSON.stringify({ ok: true, event, transaction: transactionCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('hotmart-webhook error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
