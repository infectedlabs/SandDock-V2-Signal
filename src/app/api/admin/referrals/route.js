import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/utils/supabase/authHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/referrals
 * Auth: Bearer <access_token> of the admin account.
 * Returns every referral conversion (for USDT payout bookkeeping) plus a
 * per-referrer total, since payouts are claimed manually via Telegram.
 */
export async function GET(request) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    const { data: conversions, error } = await supabase
      .from('referral_conversions')
      .select(`
        id, plan, billing_cycle, plan_price, commission_amount, created_at,
        referrer:profiles!referral_conversions_referrer_id_fkey(id, email, name),
        referred:profiles!referral_conversions_referred_user_id_fkey(id, email, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byReferrer = new Map();
    for (const c of conversions || []) {
      const key = c.referrer?.id;
      if (!key) continue;
      if (!byReferrer.has(key)) {
        byReferrer.set(key, {
          referrerId: key,
          email: c.referrer.email,
          name: c.referrer.name,
          totalEarned: 0,
          conversionCount: 0,
        });
      }
      const entry = byReferrer.get(key);
      entry.totalEarned += Number(c.commission_amount || 0);
      entry.conversionCount += 1;
    }

    return NextResponse.json({
      conversions: conversions || [],
      byReferrer: Array.from(byReferrer.values()).sort((a, b) => b.totalEarned - a.totalEarned),
    });
  } catch (err) {
    console.error('[Admin Referrals] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
