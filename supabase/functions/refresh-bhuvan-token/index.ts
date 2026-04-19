import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * refresh-bhuvan-token — daily cron (6 AM IST / 00:30 UTC)
 *
 * Calls ISRO Bhuvan auth API with stored credentials to get a fresh
 * bearer token. Upserts into system_tokens table. The /api/classroom/bhuvan
 * route reads from this table instead of env vars.
 *
 * Bhuvan tokens expire every 24 hours. This runs before the first
 * classroom session of the day.
 *
 * Secrets required:
 *   BHUVAN_USERNAME  — Bhuvan portal login email
 *   BHUVAN_PASSWORD  — Bhuvan portal password
 */

const BHUVAN_AUTH_URL = 'https://bhuvan-app1.nrsc.gov.in/api/token'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bhuvanUsername = Deno.env.get('BHUVAN_USERNAME')
    const bhuvanPassword = Deno.env.get('BHUVAN_PASSWORD')

    if (!bhuvanUsername || !bhuvanPassword) {
      return new Response(
        JSON.stringify({ error: 'BHUVAN_USERNAME or BHUVAN_PASSWORD not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Request new token from ISRO Bhuvan
    const authRes = await fetch(BHUVAN_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(bhuvanUsername)}&password=${encodeURIComponent(bhuvanPassword)}`,
    })

    if (!authRes.ok) {
      const errText = await authRes.text()
      console.error('[refresh-bhuvan-token] Auth failed:', authRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'Bhuvan auth failed', status: authRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authData = await authRes.json()
    const token = authData.token ?? authData.access_token ?? authData.jwt ?? ''

    if (!token) {
      console.error('[refresh-bhuvan-token] No token in response:', JSON.stringify(authData))
      return new Response(
        JSON.stringify({ error: 'No token in Bhuvan response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store in system_tokens table
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString() // 23h from now

    const { error: upsertError } = await admin
      .from('system_tokens')
      .upsert({
        key: 'bhuvan_token',
        value: token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (upsertError) {
      console.error('[refresh-bhuvan-token] DB upsert failed:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[refresh-bhuvan-token] Token refreshed, expires:', expiresAt)

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[refresh-bhuvan-token] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
