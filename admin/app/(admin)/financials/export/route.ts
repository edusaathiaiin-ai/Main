import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const type = req.nextUrl.searchParams.get('type') ?? 'transactions';
  const admin = getAdminClient();
  let csv = '';
  let filename = 'export.csv';

  if (type === 'transactions') {
    const { data } = await admin
      .from('subscriptions')
      .select('id, razorpay_payment_id, plan_id, amount_inr, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5000);

    filename = `edusaathiai-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    const rows = (data ?? []).map((r) =>
      [
        r.id,
        r.razorpay_payment_id ?? '',
        r.plan_id ?? '',
        r.amount_inr ?? '',
        r.status ?? '',
        new Date(r.created_at as string).toISOString(),
        r.user_id ?? '',
      ].join(',')
    );
    csv = ['ID,Razorpay Payment ID,Plan,Amount INR,Status,Date,User ID', ...rows].join('\n');

  } else if (type === 'faculty') {
    const { data } = await admin
      .from('faculty_profiles')
      .select(`
        user_id,
        total_earned_paise,
        total_sessions_completed,
        upi_id,
        profiles!inner ( full_name, email )
      `)
      .order('total_earned_paise', { ascending: false })
      .limit(1000);

    filename = `edusaathiai-faculty-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    const rows = (data ?? []).map((r) => {
      const p = r.profiles as unknown as Record<string, unknown>;
      return [
        r.user_id,
        `"${(p?.full_name as string) ?? ''}"`,
        p?.email ?? '',
        ((r.total_earned_paise as number) ?? 0) / 100,
        r.total_sessions_completed ?? 0,
        r.upi_id ?? '',
      ].join(',');
    });
    csv = ['User ID,Name,Email,Gross Earned INR,Sessions,UPI ID', ...rows].join('\n');

  } else if (type === 'students') {
    const { data } = await admin
      .from('subscriptions')
      .select('id, amount_inr, plan_id, status, created_at, user_id')
      .in('status', ['paid', 'active'])
      .order('created_at', { ascending: false })
      .limit(5000);

    filename = `edusaathiai-student-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    const rows = (data ?? []).map((r) =>
      [r.id, r.user_id, r.plan_id ?? '', r.amount_inr ?? '', r.status, new Date(r.created_at as string).toISOString()].join(',')
    );
    csv = ['ID,User ID,Plan,Amount INR,Status,Date', ...rows].join('\n');
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
