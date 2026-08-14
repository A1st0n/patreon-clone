// node --test lib/tiers.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, reaches, tierName, priceFor, yearlyCents } from './tiers.js';
import { summarise } from './analytics.js';
import { makeTeaser } from './db.js';

test('tier gating: a rank only reaches posts at or below it', () => {
  // Studio (3) sees everything; a free member (0) sees nothing locked.
  for (const { rank } of TIERS) {
    assert.ok(reaches(3, rank), 'top tier must reach every post');
    assert.ok(!reaches(0, rank), 'free members must reach no locked post');
  }
  assert.ok(reaches(2, 1), 'higher tier reaches lower-tier posts');
  assert.ok(!reaches(1, 2), 'lower tier must NOT reach higher-tier posts');
  assert.ok(reaches(1, 1), 'exact match is allowed');
  // Undefined rank (signed out) must never sneak past.
  assert.ok(!reaches(undefined, 1));
  assert.equal(tierName(0), 'Free member');
});

test('pricing: annual is ten months, tiers scale off the base price', () => {
  assert.equal(priceFor(500, 1), 500);
  assert.equal(priceFor(500, 3), 2500);
  assert.equal(yearlyCents(500), 5000);      // 2 months free, not 12x
});

test('MRR normalises annual plans and ignores non-active members', () => {
  const s = summarise([
    { rank: 1, status: 'active', interval: 'month', price_cents: 500, created_at: Date.now() },
    { rank: 3, status: 'active', interval: 'year', price_cents: 2500, created_at: Date.now() },
    { rank: 1, status: 'paused', interval: 'month', price_cents: 500, created_at: Date.now() },
    { rank: 1, status: 'canceled', interval: 'month', price_cents: 500, canceled_at: Date.now() },
  ], []);
  assert.equal(s.active, 2);
  assert.equal(s.paused, 1);
  // 500 + round(2500*10/12) = 500 + 2083
  assert.equal(s.mrr, 2583);
  assert.equal(s.lost, 1);
});

test('teaser is short, and empty captions produce none', () => {
  assert.equal(makeTeaser(''), null);
  assert.equal(makeTeaser('one two three'), 'one two three');
  const long = makeTeaser(Array.from({ length: 40 }, (_, i) => 'w' + i).join(' '));
  assert.equal(long.split(' ').length, 20);   // capped at 20 words
  assert.ok(long.endsWith('…'));              // ellipsis rides on the last one
  assert.ok(!long.includes('w20'), 'must not leak the 21st word');
});
