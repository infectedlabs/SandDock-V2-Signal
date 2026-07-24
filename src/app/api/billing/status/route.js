import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/status?userId=xxx
 * Returns the current billing status for a user (manual USDT billing -
 * no automated subscription provider).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, billing_cycle, plan_started_at, plan_ends_at, created_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, currency, status, plan, billing_cycle, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      plan:          profile.plan,
      billingCycle:  profile.billing_cycle,
      planStartedAt: profile.plan_started_at,
      planEndsAt:    profile.plan_ends_at,
      payments:      payments || [],
    });
  } catch (err) {
    console.error('[Billing Status] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
