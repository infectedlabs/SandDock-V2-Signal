import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getUserFromRequest } from '@/utils/supabase/authHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referral/me
 * Auth: Bearer <access_token> of the logged-in user.
 * Returns the caller's referral code/link, invite count, conversion history,
 * and total USDT earned (one-time commission per referred user's first
 * paid upgrade).
 */
export async function GET(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { count: inviteCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', user.id);

    const { data: conversions, error: convError } = await supabase
      .from('referral_conversions')
      .select('id, plan, billing_cycle, plan_price, commission_amount, created_at, referred_user_id, profiles!referral_conversions_referred_user_id_fkey(email)')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('[Referral Me] Conversions fetch error:', convError.message);
    }

    const totalEarned = (conversions || []).reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    return NextResponse.json({
      referralCode: profile.referral_code,
      inviteCount: inviteCount || 0,
      conversionCount: (conversions || []).length,
      totalEarned,
      conversions: (conversions || []).map((c) => ({
        id: c.id,
        plan: c.plan,
        billingCycle: c.billing_cycle,
        planPrice: c.plan_price,
        commissionAmount: c.commission_amount,
        createdAt: c.created_at,
        referredEmail: c.profiles?.email || null,
      })),
    });
  } catch (err) {
    console.error('[Referral Me] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
