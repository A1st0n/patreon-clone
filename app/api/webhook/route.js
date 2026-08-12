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
    return new Response(`bad signature: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const { error } = await admin().from('memberships').upsert(
      {
        patron_id: s.metadata.patron_id,
        creator_id: s.metadata.creator_id,
        stripe_session_id: s.id,
        status: 'active',
      },
      { onConflict: 'stripe_session_id', ignoreDuplicates: true }
    );
    if (error) return new Response(error.message, { status: 500 }); // let Stripe retry
  }

  return Response.json({ received: true });
}
