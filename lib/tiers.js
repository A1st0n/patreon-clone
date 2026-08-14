// Tier ranks are the only thing gating ever compares. Rank 0 means "free
// member" — not a real tier row, just the absence of one.
// ponytail: names/prices live in the `tiers` table when configured; this list
// is the demo's stand-in and the source of the labels either way.
export const TIERS = [
  { rank: 1, name: 'Supporter', mult: 1, perks: 'Members-only posts.' },
  { rank: 2, name: 'Insider', mult: 2, perks: 'Everything above, plus works in progress.' },
  { rank: 3, name: 'Studio', mult: 5, perks: 'Everything above, plus monthly video calls.' },
];

export const tierName = (rank) =>
  TIERS.find((t) => t.rank === rank)?.name || 'Free member';

// The one gating question, shared by the feed, the preview switch and (in SQL
// form) the RLS policy: does this rank reach that post?
export const reaches = (rank, minRank) => (rank || 0) >= (minRank || 1);

export const priceFor = (baseCents, rank) =>
  baseCents * (TIERS.find((t) => t.rank === rank)?.mult || 1);

// Annual = 10 months for 12, the usual "two months free" framing.
export const yearlyCents = (monthlyCents) => monthlyCents * 10;
