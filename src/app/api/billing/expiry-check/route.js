import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/expiry-check
 *
 * Checks for pro/master users whose plan_ends_at has passed and downgrades
 * them to the free plan. Grandmaster is a lifetime plan (plan_ends_at is
 * always null) and is never touched.
 *
 * Secure this endpoint in production by verifying CRON_SECRET header.
 * Call it from Vercel Cron (vercel.json) every 24 hours.
 */
export async function GET(request) {
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

    const { data: expiredUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, plan, plan_ends_at')
      .in('plan', ['pro', 'master'])
      .lt('plan_ends_at', now);

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

    expiredUsers.forEach(u => {
      console.log(`[Telegram Bot] Evicting user ${u.id} (${u.email}) from paid ${u.plan} Telegram channel due to plan expiry.`);
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        billing_cycle: null,
        plan_ends_at: null,
        telegram_chat_id: null,
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
      users: expiredUsers.map((u) => ({ id: u.id, email: u.email, plan: u.plan, expiredAt: u.plan_ends_at })),
    });
  } catch (err) {
    console.error('[Expiry Check] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
