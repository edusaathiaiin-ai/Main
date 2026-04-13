/**
 * supabase/functions/_shared/whatsapp.ts
 *
 * Shared helper for sending WhatsApp template messages via Meta Graph API v25.0.
 *
 * Rules (non-negotiable):
 * - Only send if waPhone is not null / empty
 * - Strip + from wa_phone before calling (pass already-stripped value, or use stripPhone)
 * - Use WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID from env — no new secrets
 * - Never throw — log errors only, never block main flow
 */

const WA_TOKEN    = Deno.env.get('WHATSAPP_TOKEN') ?? '';
const PHONE_ID    = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const API_VERSION = 'v25.0';

export interface WaTemplateParams {
  templateName: string;
  to: string;            // already stripped of + (e.g. '919825593262')
  params: string[];      // body component parameter texts, in order
  languageCode?: string; // defaults to 'en'
  logPrefix?: string;    // e.g. 'confirm-lecture-slot' for log lines
}

/** Strip leading + from a wa_phone value stored in DB (+91XXXXXXXXXX → 91XXXXXXXXXX) */
export function stripPhone(waPhone: string): string {
  return waPhone.replace(/^\+/, '');
}

/** firstName = first word of full_name */
export function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

/** Format a date as "14 April 2026" in IST */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

/** Format a time as "5:00 PM" in IST (no IST suffix — caller adds if needed) */
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

/** Format paise as "₹400" (no decimals) */
export function fmtPaise(paise: number): string {
  return `₹${Math.round(paise / 100)}`;
}

/**
 * Send a WhatsApp template message.
 * Never throws — all errors are logged only.
 * Returns true on success, false on any failure.
 */
export async function sendWhatsAppTemplate({
  templateName,
  to,
  params,
  languageCode = 'en',
  logPrefix = 'whatsapp',
}: WaTemplateParams): Promise<boolean> {
  if (!WA_TOKEN || !PHONE_ID) {
    console.warn(`${logPrefix}: WA_TOKEN or PHONE_ID not configured — skipping ${templateName}`);
    return false;
  }
  if (!to) {
    console.warn(`${logPrefix}: empty 'to' — skipping ${templateName}`);
    return false;
  }

  try {
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: params.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const responseText = await res.text();
    if (res.ok) {
      console.log(`${logPrefix}: ${templateName} → ${to} ✓ status=${res.status}`);
      return true;
    } else {
      console.error(`${logPrefix}: ${templateName} → ${to} ✗ status=${res.status} body=${responseText}`);
      return false;
    }
  } catch (err) {
    console.error(
      `${logPrefix}: ${templateName} → ${to} threw:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/**
 * Send a free-form text message to a WhatsApp number (non-template).
 * Used only within the 24-hour service window.
 * Never throws.
 */
export async function sendWhatsAppText(
  to: string,
  text: string,
  logPrefix = 'whatsapp',
): Promise<boolean> {
  if (!WA_TOKEN || !PHONE_ID || !to) return false;

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
          to,
          type: 'text',
          text: { body: text, preview_url: false },
        }),
      },
    );
    const responseText = await res.text();
    if (res.ok) {
      console.log(`${logPrefix}: free-form text → ${to} ✓`);
      return true;
    } else {
      console.error(`${logPrefix}: free-form text → ${to} ✗ status=${res.status} body=${responseText}`);
      return false;
    }
  } catch (err) {
    console.error(`${logPrefix}: free-form text threw:`, err instanceof Error ? err.message : err);
    return false;
  }
}
