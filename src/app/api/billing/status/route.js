import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/status?userId=xxx
 * Returns the current billing status for a user.
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
      .select('plan, subscription_status, trial_ends_at, current_period_end, dodo_customer_id, created_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compute trial days remaining
    let trialDaysRemaining = null;
    if (profile.plan === 'free' && profile.trial_ends_at) {
      const msLeft = new Date(profile.trial_ends_at).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    }

    const isTrialExpired =
      profile.plan === 'free' &&
      profile.trial_ends_at &&
      new Date() > new Date(profile.trial_ends_at);

    // Fetch recent payment history
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, currency, status, plan, billing_cycle, created_at, dodo_payment_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      plan:               profile.plan,
      subscriptionStatus: profile.subscription_status,
      trialEndsAt:        profile.trial_ends_at,
      trialDaysRemaining,
      isTrialExpired,
      currentPeriodEnd:   profile.current_period_end,
      dodoCustomerId:     profile.dodo_customer_id,
      payments:           payments || [],
    });
  } catch (err) {
    console.error('[Billing Status] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
