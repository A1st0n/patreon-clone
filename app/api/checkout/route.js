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

  const { creatorId } = await req.json();
  const { data: creator } = await admin()
    .from('creators').select('*').eq('id', creatorId).single();
  if (!creator) return Response.json({ error: 'no creator' }, { status: 404 });

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        recurring: { interval: 'month' },
        unit_amount: creator.price_cents,
        product_data: { name: `Patron: ${creator.name}` },
      },
    }],
    // metadata is how the webhook knows who paid for what
    metadata: { patron_id: user.id, creator_id: creator.id },
    success_url: `${site}/?joined=${creator.id}`,
    cancel_url: `${site}/`,
  });

  return Response.json({ url: session.url });
}
