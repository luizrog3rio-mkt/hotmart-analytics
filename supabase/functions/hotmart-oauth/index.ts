/**
 * Hotmart OAuth Edge Function
 *
 * Handles OAuth2 code exchange and token refresh for the Hotmart API.
 * Called from the frontend after the user completes the OAuth flow.
 *
 * POST /hotmart-oauth { action: 'exchange', code, redirect_uri }
 * POST /hotmart-oauth { action: 'refresh' }
 * POST /hotmart-oauth { action: 'disconnect' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const HOTMART_OAUTH_URL = 'https://api-hot-connect.hotmart.com/oauth/token'

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action } = body

    // ----- Exchange code for token -----
    if (action === 'exchange') {
      const { code, redirect_uri, client_id, client_secret } = body

      if (!code || !redirect_uri || !client_id || !client_secret) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: code, redirect_uri, client_id, client_secret' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id,
        client_secret,
        code,
        redirect_uri,
      })

      const tokenRes = await fetch(HOTMART_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      if (!tokenRes.ok) {
        const errText = await tokenRes.text()
        console.error('Hotmart token exchange failed:', errText)
        return new Response(
          JSON.stringify({ error: 'Token exchange failed', details: errText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const tokenData = await tokenRes.json()

      // Store tokens securely in profile
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          hotmart_token: tokenData.access_token,
          hotmart_refresh_token: tokenData.refresh_token,
          hotmart_token_expires_at: expiresAt,
          hotmart_client_id: client_id,
          hotmart_client_secret: client_secret,
        })
        .eq('id', user.id)

      if (updateErr) {
        console.error('Failed to save tokens:', updateErr)
        return new Response(
          JSON.stringify({ error: 'Failed to save tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ----- Refresh token -----
    if (action === 'refresh') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('hotmart_refresh_token, hotmart_client_id, hotmart_client_secret')
        .eq('id', user.id)
        .single()

      if (!profile?.hotmart_refresh_token || !profile?.hotmart_client_id) {
        return new Response(
          JSON.stringify({ error: 'No Hotmart connection found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: profile.hotmart_client_id,
        client_secret: profile.hotmart_client_secret,
        refresh_token: profile.hotmart_refresh_token,
      })

      const tokenRes = await fetch(HOTMART_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      if (!tokenRes.ok) {
        const errText = await tokenRes.text()
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: errText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const tokenData = await tokenRes.json()
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

      await supabase
        .from('profiles')
        .update({
          hotmart_token: tokenData.access_token,
          hotmart_refresh_token: tokenData.refresh_token,
          hotmart_token_expires_at: expiresAt,
        })
        .eq('id', user.id)

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ----- Disconnect -----
    if (action === 'disconnect') {
      await supabase
        .from('profiles')
        .update({
          hotmart_token: null,
          hotmart_refresh_token: null,
          hotmart_token_expires_at: null,
          hotmart_client_id: null,
          hotmart_client_secret: null,
          hotmart_last_sync_at: null,
        })
        .eq('id', user.id)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: exchange, refresh, disconnect' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('hotmart-oauth error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
