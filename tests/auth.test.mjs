import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSecret, verifySecret, issueSessionToken, verifySessionToken, normalizeEmail } from '../src/auth.mjs';
import { requireFamily, requireRole } from '../src/authorization.mjs';

test('password/PIN hashing verifies without storing plaintext', async () => {
  const encoded=await hashSecret('a-strong-password');
  assert.match(encoded,/^scrypt\$/);
  assert.equal(await verifySecret('a-strong-password',encoded),true);
  assert.equal(await verifySecret('wrong-password',encoded),false);
});

test('session tokens are signed, scoped and expiring', () => {
  const secret='0123456789abcdef0123456789abcdef';
  const token=issueSessionToken({sub:'p1',role:'parent',familyId:'f1'},secret,60);
  const claims=verifySessionToken(token,secret);
  assert.equal(claims.role,'parent');
  assert.equal(claims.familyId,'f1');
  assert.throws(()=>verifySessionToken(token,'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'));
});

test('authorization blocks cross-family access', () => {
  const session={role:'parent',familyId:'fam-a'};
  assert.equal(requireRole(session,'parent'),session);
  assert.equal(requireFamily(session,'fam-a'),session);
  assert.throws(()=>requireFamily(session,'fam-b'));
});

test('email normalization is deterministic',()=>assert.equal(normalizeEmail('  Parent@Example.COM '),'parent@example.com'));
