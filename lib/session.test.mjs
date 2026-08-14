// node --test lib/session.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, findUser, canPost, isAdmin } from './session.js';

test('gates', () => {
  // Admins have every capability a creator has; that is the whole rule.
  assert.deepEqual(ROLES.map(([r]) => r).filter(canPost), ['admin', 'creator']);
  assert.deepEqual(ROLES.map(([r]) => r).filter(isAdmin), ['admin']);
  // signed out is the weakest role, never the strongest
  assert.ok(![canPost, isAdmin].some((f) => f(undefined)));
});

test('lookup ignores case and stray spaces', () => {
  const users = [{ email: 'ada@x.com', role: 'unpaid' }];
  assert.equal(findUser('  Ada@X.com ', users).role, 'unpaid');
  assert.equal(findUser('nobody@x.com', users), undefined);
});
