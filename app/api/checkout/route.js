import Stripe from 'stripe';
import { admin } from '../../../lib/supabase';

// Built lazily: a missing key must not break the build, only this request.
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe is not configured' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // "JWT tied to a specific user": verify the Supabase access token, get the user.
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user }, error } = await admin().auth.getUser(token);
  if (error || !user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  // Trust boundary: the body is attacker-controlled. PostgREST binds the value
  // so a string can't inject a filter, but a non-string reaches the DB as junk.
  const { tierId, interval = 'month' } = await req.json().catch(() => ({}));
  if (typeof tierId !== 'string') return Response.json({ error: 'bad request' }, { status: 400 });
  if (interval !== 'month' && interval !== 'year') {
    return Response.json({ error: 'bad interval' }, { status: 400 });
  }

  // Price comes from the tier row, never from the request body.
  const { data: tier } = await admin()
    .from('tiers').select('*, creators(id, name)').eq('id', tierId).single();
  if (!tier) return Response.json({ error: 'no tier' }, { status: 404 });

  // Annual bills 10 months for 12; keep the maths here, not in the browser.
  const amount = interval === 'year' ? tier.price_cents * 10 : tier.price_cents;

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        recurring: { interval },
        unit_amount: amount,
        product_data: { name: `${tier.creators.name} — ${tier.name}` },
      },
    }],
    // metadata is how the webhook knows who paid for what
    metadata: {
      patron_id: user.id, creator_id: tier.creators.id, tier_id: tier.id, interval,
    },
    success_url: `${site}/?joined=${tier.creators.id}`,
    cancel_url: `${site}/`,
  });

  return Response.json({ url: session.url });
}
