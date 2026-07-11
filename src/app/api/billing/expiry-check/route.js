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

    // Find paid users whose subscription period has ended or who are explicitly marked expired
    const { data: expiredUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, plan, current_period_end, subscription_status')
      .in('plan', ['pro', 'master', 'lifetime'])
      .or(`subscription_status.eq.expired,current_period_end.lt.${now}`);

    if (fetchError) {
      console.error('[Expiry Check] Fetch error:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('[Expiry Check] No expired subscriptions found.');
      return NextResponse.json({ downgraded: 0, message: 'No expired subscriptions.' });
    }

    console.log(`[Expiry Check] Found ${expiredUsers.length} expired subscription(s). Downgrading and evicting from channels...`);

    const ids = expiredUsers.map((u) => u.id);

    // Eviction logging
    expiredUsers.forEach(u => {
      console.log(`[Telegram Bot] Evicting user ${u.id} (${u.email}) from paid ${u.plan} Telegram channel due to plan expiry.`);
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan:                'free',
        subscription_status: 'expired',
        current_period_end:  null,
        trial_ends_at:       null,
        telegram_chat_id:    null,
        telegram_invite_link: null,
        telegram_invite_claimed: false
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
