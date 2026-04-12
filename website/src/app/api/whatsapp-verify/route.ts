// POST /api/whatsapp-verify
// Sends the hello_world WhatsApp template to the given number so the
// user can confirm they own it. No auth token required here because the
// number hasn't been saved yet — we just send and let the UI confirm receipt.

import { NextRequest, NextResponse } from 'next/server'

const WA_TOKEN    = process.env.WHATSAPP_TOKEN        ?? ''
const PHONE_ID    = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''

function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: unknown }
    const raw = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : ''

    // Expect exactly 10 digits (national format)
    if (!isValidIndianMobile(raw)) {
      return NextResponse.json(
        { error: 'Enter a valid 10-digit Indian mobile number' },
        { status: 400 },
      )
    }

    if (!WA_TOKEN || !PHONE_ID) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
    }

    const waPhone = `91${raw}` // Meta format — no +

    const res = await fetch(
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

    const data = await res.json() as { error?: { message?: string } }

    if (!res.ok) {
      const msg = data?.error?.message ?? 'WhatsApp send failed'
      console.error('[whatsapp-verify] Meta error:', msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp-verify] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
