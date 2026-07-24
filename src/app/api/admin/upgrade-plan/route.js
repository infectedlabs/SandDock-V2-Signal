import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/utils/supabase/authHelpers';
import { getPlanPrice, getCommissionAmount, computePlanEndsAt, BILLING_CYCLES_BY_PLAN } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/upgrade-plan
 * Auth: Bearer <access_token> of the admin account.
 * Body: { userId, newPlan: 'free'|'pro'|'master'|'grandmaster', billingCycle?: 'monthly'|'yearly'|'lifetime' }
 *
 * Manually sets a user's plan after the admin has confirmed a USDT payment
 * outside the app. If this is the user's first transition from free to a
 * paid plan and they were referred, a one-time 10% referral commission is
 * recorded automatically.
 */
export async function POST(request) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, newPlan, billingCycle } = await request.json();

    if (!userId || !newPlan) {
      return NextResponse.json({ error: 'userId and newPlan are required' }, { status: 400 });
    }
    if (!['free', 'pro', 'master', 'grandmaster'].includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (newPlan !== 'free' && !BILLING_CYCLES_BY_PLAN[newPlan]?.includes(billingCycle)) {
      return NextResponse.json({ error: `Invalid billing cycle for ${newPlan}` }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, plan, referred_by')
      .eq('id', userId)
      .single();

    if (fetchError || !existingProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const updates = {
      plan: newPlan,
      billing_cycle: newPlan === 'free' ? null : billingCycle,
      plan_started_at: newPlan === 'free' ? null : now.toISOString(),
      plan_ends_at: newPlan === 'free' ? null : computePlanEndsAt(newPlan, billingCycle, now),
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let commission = null;

    // Record the manual USDT payment + a one-time referral commission, only
    // when this is a genuine upgrade to a paid plan (not a downgrade/no-op).
    if (newPlan !== 'free') {
      const planPrice = getPlanPrice(newPlan, billingCycle);

      await supabase.from('payments').insert({
        user_id: userId,
        amount: planPrice,
        currency: 'USDT',
        status: 'succeeded',
        plan: newPlan,
        billing_cycle: billingCycle,
      });

      const isFirstEverPaidUpgrade = existingProfile.plan === 'free';

      if (isFirstEverPaidUpgrade && existingProfile.referred_by) {
        const { data: alreadyConverted } = await supabase
          .from('referral_conversions')
          .select('id')
          .eq('referred_user_id', userId)
          .maybeSingle();

        if (!alreadyConverted) {
          const commissionAmount = getCommissionAmount(newPlan, billingCycle);
          const { data: inserted, error: convError } = await supabase
            .from('referral_conversions')
            .insert({
              referrer_id: existingProfile.referred_by,
              referred_user_id: userId,
              plan: newPlan,
              billing_cycle: billingCycle,
              plan_price: planPrice,
              commission_amount: commissionAmount,
            })
            .select()
            .single();

          if (convError) {
            console.error('[Upgrade Plan] Referral conversion insert error:', convError.message);
          } else {
            commission = inserted;
          }
        }
      }
    }

    return NextResponse.json({ profile: updatedProfile, commission });
  } catch (err) {
    console.error('[Upgrade Plan] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
