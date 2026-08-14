import Stripe from 'stripe';
import { admin } from '../../../lib/supabase';

// Pause / resume / cancel, plus a link to Stripe's own billing portal for card
// changes and invoices. ponytail: pausing is Stripe's `pause_collection`, not a
// flag we invent — that way billing and access can never disagree.
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe is not configured' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const db = admin();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { membershipId, action } = await req.json().catch(() => ({}));
  const ACTIONS = ['pause', 'resume', 'cancel', 'portal'];
  if (typeof membershipId !== 'string' || !ACTIONS.includes(action)) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  // Ownership check: the id came from the client, so prove it is theirs.
  const { data: m } = await db.from('memberships').select('*')
    .eq('id', membershipId).eq('patron_id', user.id).single();
  if (!m) return Response.json({ error: 'not found' }, { status: 404 });

  if (action === 'portal') {
    const s = await stripe.billingPortal.sessions.create({
      customer: m.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
    });
    return Response.json({ url: s.url });
  }

  if (action === 'cancel') {
    await stripe.subscriptions.update(m.stripe_subscription_id, { cancel_at_period_end: true });
    // Access runs to the end of the paid period; the webhook flips it to
    // 'canceled' when Stripe actually ends the subscription.
    return Response.json({ status: m.status, ends: m.current_period_end });
  }

  const pausing = action === 'pause';
  await stripe.subscriptions.update(m.stripe_subscription_id, {
    pause_collection: pausing ? { behavior: 'void' } : '',
  });
  const status = pausing ? 'paused' : 'active';
  await db.from('memberships').update({ status }).eq('id', m.id);
  return Response.json({ status });
}
