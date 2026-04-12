// POST /api/whatsapp-verify
// Receives { phone: '919825593262' } — full number, no +, country code included
// Sends hello_world template via Meta Graph API to verify ownership
// Returns { success: true } or { error: string }
// WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are server-side only — never exposed to client
// No DB write — DB write happens only after user confirms receipt on frontend

import { NextRequest, NextResponse } from 'next/server'

const WA_TOKEN = process.env.WHATSAPP_TOKEN           ?? ''
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''

// Accepts full E.164-minus-plus format: 91XXXXXXXXXX (12 digits starting with 91)
// or just the 10-digit national number starting with 6-9
function parsePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits[2])) {
    return digits // already full format
  }
  if (digits.length === 10 && /^[6-9]/.test(digits[0])) {
    return `91${digits}` // prepend country code
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: unknown }
    const raw  = typeof body.phone === 'string' ? body.phone : ''

    const waPhone = parsePhone(raw)
    if (!waPhone) {
      return NextResponse.json(
        { error: 'Enter a valid 10-digit Indian mobile number' },
        { status: 400 },
      )
    }

    if (!WA_TOKEN || !PHONE_ID) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v25.0/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waPhone,
          type: 'template',
          template: {
            name: 'hello_world',
            language: { code: 'en_US' },
          },
        }),
      },
    )

    const data = await metaRes.json() as { error?: { message?: string } }

    if (!metaRes.ok) {
      const msg = data?.error?.message ?? 'WhatsApp send failed'
      console.error('[whatsapp-verify] Meta error:', msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[whatsapp-verify] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
