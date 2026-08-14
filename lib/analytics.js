import { supabase, isConfigured } from './supabase.js';
import { TIERS, priceFor } from './tiers.js';

const DAY = 86400000;

// Pure so it can be tested without a browser or a database.
// members: [{ rank, status, interval, created_at, canceled_at }]
export function summarise(members, posts, now = Date.now()) {
  const active = members.filter((m) => m.status === 'active');
  // Annual is billed 10 months for 12, so its monthly contribution is price*10/12.
  const mrr = active.reduce((n, m) =>
    n + (m.interval === 'year' ? Math.round(m.price_cents * 10 / 12) : m.price_cents), 0);

  const since = (ts) => ts && now - new Date(ts).getTime() <= 30 * DAY;
  const gained = members.filter((m) => since(m.created_at)).length;
  const lost = members.filter((m) => m.status !== 'active' && since(m.canceled_at)).length;

  const byTier = TIERS.map((t) => ({
    ...t, count: active.filter((m) => m.rank === t.rank).length,
  }));

  const top = [...posts]
    .filter((p) => !p.draft)
    .sort((a, b) => (b.likes || 0) + (b.comments?.length || 0)
                  - ((a.likes || 0) + (a.comments?.length || 0)))
    .slice(0, 5);

  return {
    mrr, active: active.length, paused: members.filter((m) => m.status === 'paused').length,
    gained, lost,
    churn: active.length + lost ? +(lost / (active.length + lost) * 100).toFixed(1) : 0,
    byTier, top,
  };
}

// Demo mode has no memberships table: derive a roster from the local users list.
export async function loadMembers(users, basePrice = 500) {
  if (!isConfigured) {
    return users
      .filter((u) => u.role === 'paid')   // staff accounts are not customers
      .map((u) => ({
        rank: u.rank || 1, status: 'active', interval: 'month',
        created_at: u.seen, canceled_at: null,
        price_cents: priceFor(basePrice, u.rank || 1),
      }));
  }
  const { data, error } = await supabase
    .from('memberships')
    .select('status, interval, created_at, tiers(rank, price_cents)');
  if (error) throw error;
  return (data || []).map((m) => ({
    rank: m.tiers?.rank || 1, status: m.status, interval: m.interval,
    created_at: m.created_at, canceled_at: m.status === 'canceled' ? m.created_at : null,
    price_cents: m.tiers?.price_cents || 0,
  }));
}
