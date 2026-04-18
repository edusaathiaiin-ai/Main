import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sessionId, items, sessionTitle } = body as {
    sessionId: string
    items: { text: string; studentName: string; dueDate: string | null }[]
    sessionTitle: string
  }

  if (!sessionId || !items?.length) {
    return NextResponse.json({ error: 'Missing sessionId or items' }, { status: 400 })
  }

  // Verify caller is faculty of this session
  const { data: session } = await supabase
    .from('live_sessions')
    .select('faculty_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.faculty_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized for this session' }, { status: 403 })
  }

  // Get booked students with WhatsApp numbers
  const { data: bookings } = await supabase
    .from('live_bookings')
    .select('user_id, profiles!inner(full_name, wa_phone)')
    .eq('session_id', sessionId)

  const homeworkText = items
    .map((item, i) => `${i + 1}. ${item.text}${item.dueDate ? ` (due: ${item.dueDate})` : ''}`)
    .join('\n')

  const waToken = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  let sent = 0

  if (waToken && phoneNumberId && bookings?.length) {
    for (const booking of bookings) {
      const profile = booking.profiles as unknown as { full_name: string; wa_phone: string | null }
      if (!profile?.wa_phone) continue

      const phone = profile.wa_phone.replace(/^\+/, '')
      const message = `📝 *Homework — ${sessionTitle}*\n\n${homeworkText}\n\n— Your faculty via EdUsaathiAI`

      try {
        await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message },
          }),
        })
        sent++
      } catch { /* continue to next student */ }
    }
  }

  return NextResponse.json({ success: true, sent, total: bookings?.length ?? 0 })
}
