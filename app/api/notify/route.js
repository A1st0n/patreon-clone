import { admin } from '../../../lib/supabase';

// Email patrons when a post goes live. ponytail: Resend's HTTP API over plain
// fetch — no SDK for one POST. Ceiling: sends inline, so a creator with
// thousands of patrons will outlast the function timeout; move to a queue then.
export async function POST(req) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ skipped: 'email not configured' }, { status: 202 });
  }
  const { postId } = await req.json().catch(() => ({}));
  if (typeof postId !== 'string') return Response.json({ error: 'bad request' }, { status: 400 });

  const db = admin();
  const { data: post } = await db
    .from('posts').select('id, teaser, draft, creator_id, creators(name)')
    .eq('id', postId).single();
  if (!post || post.draft) return Response.json({ skipped: 'not a live post' }, { status: 202 });

  // Only active patrons of this creator, and only their email addresses.
  const { data: patrons } = await db
    .from('memberships').select('patron_id, profiles(email)')
    .eq('creator_id', post.creator_id).eq('status', 'active');
  const to = (patrons || []).map((p) => p.profiles?.email).filter(Boolean);
  if (!to.length) return Response.json({ sent: 0 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Patronage <posts@patronage.demo>',
      // bcc: patrons must not see each other's addresses
      to: process.env.EMAIL_FROM || 'Patronage <posts@patronage.demo>',
      bcc: to,
      subject: `${post.creators?.name || 'A creator'} posted something new`,
      text: `${post.teaser || 'A new post is up.'}\n\nRead it: ${site}/feed`,
    }),
  });
  if (!res.ok) {
    console.error('resend failed:', res.status, await res.text());
    return new Response('email failed', { status: 502 });
  }
  return Response.json({ sent: to.length });
}
