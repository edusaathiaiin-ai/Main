// ─────────────────────────────────────────────────────────────────────────────
// Node-side WhatsApp helper for admin-only operational alerts.
// Mirrors the shared Deno helper in supabase/functions/_shared/whatsapp.ts but
// runs inside Next.js API routes. Only free-form text is supported here — we
// rely on the 24-hour service window that the founder (+91 98255 93262) keeps
// alive by periodically messaging the business number. No new Meta template
// needed for these alerts. Fails silently — the email path is authoritative.
// ─────────────────────────────────────────────────────────────────────────────

const WA_TOKEN = process.env.WHATSAPP_TOKEN ?? ''
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
const API_VERSION = 'v25.0'

// Founder's personal number — the only destination these admin alerts go to.
// Stored in +91XXXXXXXXXX format in .env or inline here; Meta expects no +.
export const ADMIN_WA_PHONE = '919825593262'

export async function sendAdminWhatsAppText(
  text: string,
  logPrefix = 'admin-wa',
): Promise<boolean> {
  if (!WA_TOKEN || !PHONE_ID) {
    console.warn(`[${logPrefix}] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing — skipping`)
    return false
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: ADMIN_WA_PHONE,
          type: 'text',
          text: { body: text, preview_url: false },
        }),
      },
    )

    if (res.ok) {
      console.log(`[${logPrefix}] → admin ✓`)
      return true
    }

    const detail = await res.text().catch(() => '')
    console.error(`[${logPrefix}] → admin ✗ status=${res.status} body=${detail.slice(0, 300)}`)
    return false
  } catch (err) {
    console.error(`[${logPrefix}] threw:`, err instanceof Error ? err.message : err)
    return false
  }
}
