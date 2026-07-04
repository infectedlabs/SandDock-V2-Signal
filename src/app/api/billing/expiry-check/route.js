import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/expiry-check
 * 
 * Checks for users whose paid subscription has expired (current_period_end < now).
 * Downgrades them to the free plan and marks subscription_status = 'expired'.
 * 
 * Lifetime users (plan = 'lifetime') are NEVER touched.
 * 
 * Secure this endpoint in production by verifying CRON_SECRET header.
 * Call it from Vercel Cron (vercel.json) every 24 hours.
 */
export async function GET(request) {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Find paid users whose subscription period has ended
    const { data: expiredUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, plan, current_period_end, subscription_status')
      .in('plan', ['pro', 'master'])
      .not('subscription_status', 'eq', 'lifetime')
      .lt('current_period_end', now)
      .not('current_period_end', 'is', null);

    if (fetchError) {
      console.error('[Expiry Check] Fetch error:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('[Expiry Check] No expired subscriptions found.');
      return NextResponse.json({ downgraded: 0, message: 'No expired subscriptions.' });
    }

    console.log(`[Expiry Check] Found ${expiredUsers.length} expired subscription(s). Downgrading...`);

    const ids = expiredUsers.map((u) => u.id);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan:                'free',
        subscription_status: 'expired',
        current_period_end:  null,
        // Set trial_ends_at in the past so they can't use trial features either
        trial_ends_at: new Date(Date.now() - 1).toISOString(),
      })
      .in('id', ids);

    if (updateError) {
      console.error('[Expiry Check] Update error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[Expiry Check] Downgraded ${ids.length} user(s) to free.`);
    return NextResponse.json({
      downgraded: ids.length,
      users: expiredUsers.map((u) => ({ id: u.id, email: u.email, plan: u.plan, expiredAt: u.current_period_end })),
    });
  } catch (err) {
    console.error('[Expiry Check] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
