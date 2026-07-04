import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getProductId, isPaidPlan } from '@/lib/dodopayments';

function getDodoClient() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('DODO_PAYMENTS_API_KEY is not set. Add it to .env.local.');
  }
  const DodoPayments = require('dodopayments').default;
  return new DodoPayments({
    bearerToken: apiKey,
    environment: process.env.DODO_PAYMENTS_TEST_MODE === 'true' ? 'test_mode' : 'live_mode',
  });
}

export async function POST(request) {
  try {
    const { plan, billingCycle = 'monthly', userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!isPaidPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, plan')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const productId = getProductId(plan, billingCycle);
    if (!productId) {
      return NextResponse.json(
        { error: `Product ID for plan '${plan}' (${billingCycle}) is not configured. Add it to .env.local.` },
        { status: 500 }
      );
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = (request.headers.get('x-forwarded-proto') || 'http').split(',')[0];
    const origin = `${proto}://${host}`;

    console.log(`[Checkout] Creating session: plan=${plan}, cycle=${billingCycle}, product=${productId}`);

    const dodo = getDodoClient();
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: profile.email },
      return_url: `${origin}/billing?success=true&plan=${plan}`,
      metadata: {
        user_id: userId,
        plan,
        billing_cycle: billingCycle,
      },
    });

    console.log(`[Checkout] Session created: ${session.checkout_url}`);
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (err) {
    console.error('[Checkout] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
