import Stripe from 'stripe';
import { admin } from '../../../lib/supabase';

// Client is built inside the handler so a missing key cannot break the build.

// This IS the async queue: Stripe delivers events out-of-band and retries with
// backoff for ~3 days on non-2xx. The unique stripe_session_id makes the insert
// idempotent so retries don't double-charge membership.
// ponytail: webhook-as-queue. Move to a real queue (SQS/QStash) only if
// post-payment work grows past what fits in one 2xx-under-timeout handler.
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe is not configured', { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const body = await req.text(); // raw body required for signature check
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      req.headers.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    // Don't echo the parser's message back: it quotes the attacker's own
    // stripe-signature header and leaks how verification failed.
    console.error('webhook signature rejected:', err.message);
    return new Response('bad signature', { status: 400 });
  }

  const db = admin();

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const { error } = await db.from('memberships').upsert(
      {
        patron_id: s.metadata.patron_id,
        creator_id: s.metadata.creator_id,
        tier_id: s.metadata.tier_id || null,
        interval: s.metadata.interval || 'month',
        stripe_session_id: s.id,
        stripe_customer_id: s.customer,
        stripe_subscription_id: s.subscription,
        status: 'active',
      },
      { onConflict: 'stripe_session_id', ignoreDuplicates: true }
    );
    // 500 makes Stripe retry; the Postgres message stays in the log, not the body.
    if (error) {
      console.error('membership upsert failed:', error.message);
      return new Response('upsert failed', { status: 500 });
    }
    // profiles.role is a label for the UI; the paywall reads memberships.
    await db.from('profiles').update({ role: 'paid' }).eq('id', s.metadata.patron_id);
  }

  // Access has to end when the money does, and resume when it resumes.
  if (event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const status = event.type === 'customer.subscription.deleted' ? 'canceled'
      : sub.pause_collection ? 'paused'
      : sub.status === 'active' || sub.status === 'trialing' ? 'active'
      : 'paused';   // past_due / unpaid: hold access until payment recovers
    const { error } = await db.from('memberships').update({
      status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString() : null,
    }).eq('stripe_subscription_id', sub.id);
    if (error) {
      console.error('membership status update failed:', error.message);
      return new Response('update failed', { status: 500 });
    }
  }

  return Response.json({ received: true });
}
