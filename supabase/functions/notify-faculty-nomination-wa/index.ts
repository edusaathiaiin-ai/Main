import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const { nominationId } = await req.json()

    if (!nominationId) {
      return new Response(
        JSON.stringify({ error: 'nominationId required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch nomination + nominator details
    const { data: nomination, error: fetchError } = await supabase
      .from('faculty_nominations')
      .select(`
        *,
        student:nominated_by_user_id (
          full_name,
          institution_name,
          city
        )
      `)
      .eq('id', nominationId)
      .single()

    if (fetchError || !nomination) {
      console.error('[notify-faculty-nomination-wa] nominationId:', nominationId, 'fetchError:', fetchError?.message)
      return new Response(
        JSON.stringify({ error: 'Nomination not found', detail: fetchError?.message }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Must have phone number
    if (!nomination.faculty_phone) {
      return new Response(
        JSON.stringify({ error: 'No phone number for this nomination' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Already sent — idempotent
    if (nomination.whatsapp_sent_at) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'already_sent' }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Clean phone — remove all non-digits, ensure country code
    let cleanPhone = nomination.faculty_phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.slice(1)
    }
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone
    }

    // Get nominator name
    const student = nomination.student as { full_name?: string; institution_name?: string } | null
    const nominatorName = student?.full_name ?? 'A student'
    const nominatorContext = student?.institution_name
      ? `a student at ${student.institution_name}`
      : 'one of our students'

    // Get faculty first name (strip title)
    const cleanFacultyName = (nomination.faculty_name as string)
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
    const facultyFirstName = cleanFacultyName.split(' ')[0]

    // Build WhatsApp message
    const messageBody = [
      `Namaste ${facultyFirstName} 🙏`,
      '',
      `${nominatorName}, ${nominatorContext}, has personally recommended you as an expert on EdUsaathiAI.`,
      '',
      nomination.bio_note
        ? `They wrote: "${(nomination.bio_note as string).slice(0, 150)}${(nomination.bio_note as string).length > 150 ? '...' : ''}"`
        : null,
      nomination.bio_note ? '' : null,
      `Your expertise in *${nomination.expertise_area}* would mean a great deal to our students.`,
      '',
      `EdUsaathiAI is India's first subject-specific AI companion platform — 30 specialist Saathis serving students across medicine, law, engineering, science, and commerce.`,
      '',
      `Learn more and apply: edusaathiai.in/teach`,
      '',
      `— Jaydeep Buch`,
      `Founder, EdUsaathiAI · Ahmedabad`,
    ]
      .filter((line) => line !== null)
      .join('\n')

    // Send via WhatsApp Cloud API — free-form text
    const waResponse = await fetch(
      `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: messageBody },
        }),
      }
    )

    const waResult = await waResponse.json()

    if (!waResponse.ok) {
      await supabase
        .from('faculty_nominations')
        .update({
          whatsapp_delivered: false,
          whatsapp_error: JSON.stringify(waResult),
        })
        .eq('id', nominationId)

      console.error('[notify-faculty-nomination-wa] WhatsApp API error:', JSON.stringify(waResult))

      const errorCode = waResult?.error?.code
      if (errorCode === 131047) {
        return new Response(
          JSON.stringify({
            error: 'outside_window',
            message: 'Faculty has not messaged us before — free-form text blocked. Use email instead.',
          }),
          { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'WhatsApp send failed', details: waResult }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Log success
    await supabase
      .from('faculty_nominations')
      .update({
        whatsapp_sent_at: new Date().toISOString(),
        whatsapp_delivered: true,
        whatsapp_error: null,
      })
      .eq('id', nominationId)

    return new Response(
      JSON.stringify({
        success: true,
        messageId: waResult?.messages?.[0]?.id,
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[notify-faculty-nomination-wa] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
