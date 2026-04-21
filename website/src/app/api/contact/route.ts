import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/contact
 * Body: { name: string, email: string, phone: string, message: string }
 * All fields required. `message` capped at 300 chars.
 *
 * Sends the submission to admin@edusaathiai.in via Resend.
 * Silently rate-limited by IP (in-memory, process-lifetime) to
 * mitigate casual abuse. For real abuse protection, add Turnstile
 * or similar later.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = 'admin@edusaathiai.in'
const FROM_ADDRESS = 'EdUsaathiAI Contact <noreply@edusaathiai.in>'
const MAX_MESSAGE_LENGTH = 300

// Per-IP throttle: max 3 submissions per 10 min. Process memory only.
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const ipHits = new Map<string, number[]>()

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function isPhone(v: string): boolean {
  // Lightweight check: 7-15 digits, optional + prefix, spaces/dashes ok
  const digits = v.replace(/[\s\-()]/g, '')
  return /^\+?\d{7,15}$/.test(digits)
}

function throttle(ip: string): boolean {
  const now = Date.now()
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (arr.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, arr)
    return true
  }
  arr.push(now)
  ipHits.set(ip, arr)
  return false
}

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Contact form not configured on server' },
      { status: 503 }
    )
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (throttle(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  let body: { name?: string; email?: string; phone?: string; message?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !phone || !message) {
    return NextResponse.json(
      { error: 'All fields are required.' },
      { status: 400 }
    )
  }
  if (name.length > 80) {
    return NextResponse.json({ error: 'Name too long.' }, { status: 400 })
  }
  if (!isEmail(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email.' },
      { status: 400 }
    )
  }
  if (!isPhone(phone)) {
    return NextResponse.json(
      { error: 'Please enter a valid contact number.' },
      { status: 400 }
    )
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 }
    )
  }

  // Strip HTML from anything that could echo into the email body
  function esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  const subject = `Contact form — ${esc(name)}`
  const html = `
    <!doctype html><html><body style="font-family:Trebuchet MS,sans-serif;color:#000;">
      <h2 style="margin:0 0 16px;font-size:18px;">New contact form submission</h2>
      <p style="margin:0 0 6px;"><strong>Name:</strong> ${esc(name)}</p>
      <p style="margin:0 0 6px;"><strong>Email:</strong> ${esc(email)}</p>
      <p style="margin:0 0 6px;"><strong>Phone:</strong> ${esc(phone)}</p>
      <p style="margin:16px 0 6px;"><strong>Message:</strong></p>
      <p style="margin:0;padding:12px 14px;background:#f5f5f5;border-left:3px solid #000;white-space:pre-wrap;">${esc(message)}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;"/>
      <p style="font-size:12px;color:#666;margin:0;">Sent via edusaathiai.in contact form · IP ${esc(ip)}</p>
    </body></html>
  `.trim()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ADMIN_EMAIL],
      reply_to: email,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('Resend error', res.status, detail.slice(0, 500))
    return NextResponse.json(
      { error: 'Could not send your message right now. Please email admin@edusaathiai.in directly.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
