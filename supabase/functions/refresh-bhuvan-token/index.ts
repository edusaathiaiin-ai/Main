import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * refresh-bhuvan-token — dual purpose:
 *
 * POST with { token: "..." } → manually store a new Bhuvan token
 *   (called by admin after browser login + copying token from DevTools)
 *
 * POST with {} → health check (cron, daily 6 AM IST)
 *   Pings Bhuvan with stored token. If 401 → sends WhatsApp alert
 *   to Jaydeep so he can refresh manually.
 *
 * ISRO Bhuvan uses CAPTCHA-protected browser login — automated
 * token refresh is not possible. This is the pragmatic workaround.
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json().catch(() => ({}))

    // ── Mode 1: Manual token update from admin ──
    if (body.token) {
      const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()

      await admin.from('system_tokens').upsert({
        key: 'bhuvan_token',
        value: body.token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

      console.log('[refresh-bhuvan-token] Token manually updated, expires:', expiresAt)

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Mode 2: Health check (cron) ──
    const { data: row } = await admin
      .from('system_tokens')
      .select('value, expires_at')
      .eq('key', 'bhuvan_token')
      .single()

    if (!row?.value || !row.expires_at) {
      await sendAlert(admin, 'No Bhuvan token stored. Please log in and update.')
      return new Response(
        JSON.stringify({ status: 'no_token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const expired = new Date(row.expires_at) < new Date()
    if (expired) {
      await sendAlert(admin, 'Bhuvan token expired. Please log in and refresh.')
      return new Response(
        JSON.stringify({ status: 'expired', expires_at: row.expires_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ping Bhuvan to verify token is still valid
    try {
      const testRes = await fetch('https://bhuvan-app1.nrsc.gov.in/api/layers', {
        headers: { Authorization: `Bearer ${row.value}`, Accept: 'application/json' },
      })

      if (testRes.status === 401) {
        // Token rejected early — mark as expired and alert
        await admin.from('system_tokens').update({
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('key', 'bhuvan_token')

        await sendAlert(admin, 'Bhuvan token rejected (401). Please log in and refresh.')

        return new Response(
          JSON.stringify({ status: 'token_rejected' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[refresh-bhuvan-token] Health check passed, status:', testRes.status)
    } catch {
      console.log('[refresh-bhuvan-token] Bhuvan unreachable — skipping health check')
    }

    return new Response(
      JSON.stringify({ status: 'healthy', expires_at: row.expires_at }),
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

async function sendAlert(admin: ReturnType<typeof createClient>, message: string) {
  const waToken = Deno.env.get('WHATSAPP_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const adminPhone = '919825593262' // Jaydeep's number

  if (!waToken || !phoneNumberId) {
    console.log('[refresh-bhuvan-token] Alert (no WA):', message)
    return
  }

  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: adminPhone,
        type: 'text',
        text: { body: `🛰️ EdUsaathiAI — ${message}\n\nLogin: https://bhuvan-app1.nrsc.gov.in` },
      }),
    })
  } catch {
    console.error('[refresh-bhuvan-token] WhatsApp alert failed')
  }
}
