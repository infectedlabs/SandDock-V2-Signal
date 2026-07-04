import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { headers } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  return new Response('Dodo Payments Webhook Endpoint is Active.', { status: 200 });
}

export async function POST(request) {
  const rawBody = await request.text();
  const headersList = await headers();

  // ── Signature Verification ─────────────────────────────────────────────────
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
  if (webhookSecret) {
    try {
      const wh = new Webhook(webhookSecret);
      await wh.verify(rawBody, {
        'webhook-id':        headersList.get('webhook-id')        || '',
        'webhook-signature': headersList.get('webhook-signature') || '',
        'webhook-timestamp': headersList.get('webhook-timestamp') || '',
      });
      console.log('[Dodo Webhook] Signature verified');
    } catch (err) {
      console.error('[Dodo Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[Dodo Webhook] DODO_WEBHOOK_SECRET not set — skipping verification');
  }

  const event = JSON.parse(rawBody);
  console.log(`[Dodo Webhook] Event: ${event.type}`);

  const supabase = createAdminClient();

  try {
    switch (event.type) {

      // ── Subscription became active (new or reactivated) ──────────────────
      case 'subscription.active': {
        const { customer, metadata, next_billing_date } = event.data;
        const userId = metadata?.user_id;
        const plan   = metadata?.plan || 'pro';
        if (!userId) break;

        await supabase.from('profiles').update({
          plan,
          subscription_status: plan === 'lifetime' ? 'lifetime' : 'active',
          dodo_customer_id:    customer?.customer_id ?? null,
          current_period_end:  plan === 'lifetime' ? null : (next_billing_date ?? null),
          trial_ends_at:       null, // clear trial once paid
        }).eq('id', userId);

        console.log(`[Dodo Webhook] User ${userId} upgraded to ${plan}`);
        break;
      }

      // ── Subscription renewed ─────────────────────────────────────────────
      case 'subscription.renewed': {
        const { customer, metadata, next_billing_date } = event.data;
        const userId = metadata?.user_id;
        if (!userId) break;

        await supabase.from('profiles').update({
          subscription_status: 'active',
          current_period_end:  next_billing_date ?? null,
        }).eq('id', userId);

        console.log(`[Dodo Webhook] Subscription renewed for user ${userId}`);
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────
      case 'subscription.cancelled': {
        const { customer, metadata } = event.data;
        const userId = metadata?.user_id;
        if (!userId) break;

        // Keep current plan until period end — just mark status
        await supabase.from('profiles').update({
          subscription_status: 'cancelled',
        }).eq('id', userId);

        console.log(`[Dodo Webhook] Subscription cancelled for user ${userId}`);
        break;
      }

      // ── Subscription on hold / failed ────────────────────────────────────
      case 'subscription.on_hold':
      case 'subscription.failed': {
        const { customer, metadata } = event.data;
        const userId = metadata?.user_id;
        if (!userId) break;

        await supabase.from('profiles').update({
          plan:                'free',
          subscription_status: event.type === 'subscription.on_hold' ? 'on_hold' : 'expired',
          current_period_end:  null,
        }).eq('id', userId);

        console.log(`[Dodo Webhook] User ${userId} downgraded to free (${event.type})`);
        break;
      }

      // ── Payment succeeded ────────────────────────────────────────────────
      case 'payment.succeeded': {
        const { payment_id, total_amount, currency, metadata } = event.data;
        const userId = metadata?.user_id;
        if (!userId) break;

        // Log payment record
        await supabase.from('payments').insert({
          user_id:        userId,
          amount:         total_amount / 100,
          currency:       currency || 'USD',
          status:         'succeeded',
          dodo_payment_id: payment_id,
          plan:           metadata?.plan || 'pro',
          billing_cycle:  metadata?.billing_cycle || 'monthly',
        });

        console.log(`[Dodo Webhook] Payment ${payment_id} logged for user ${userId}`);
        break;
      }

      default:
        console.log(`[Dodo Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Dodo Webhook] Processing error:', err.message);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
