import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSecret } from '../src/auth.mjs';
import { PostgresPlatformStore } from '../src/db/postgres.mjs';

const connectionString = process.env.TEST_DATABASE_URL;

test('PostgreSQL adapter persists identity, consent, safety and grounded tutor trace', { skip: !connectionString }, async () => {
  const platform = await PostgresPlatformStore.connect(connectionString);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `ci-${suffix}@example.test`;
  const passwordHash = await hashSecret('postgres-test-password');
  const pinHash = await hashSecret('2468');

  try {
    const { family, parent } = await platform.registerParent({ email, passwordHash });
    assert.equal((await platform.getParentByEmail(email)).id, parent.id);
    assert.equal(await platform.hasActiveConsent(family.id), false);

    const consent = await platform.grantConsent({
      familyId: family.id,
      parentId: parent.id,
      policyVersion: 'ci-consent-v1'
    });
    assert.equal(consent.familyId, family.id);
    assert.equal(await platform.hasActiveConsent(family.id), true);

    const child = await platform.createChild({
      familyId: family.id,
      displayName: 'CI Learner',
      gradeLevel: 4,
      handle: `ci-${suffix}`.slice(0, 60),
      pinHash
    });
    assert.equal((await platform.getChildByHandle(child.handle)).id, child.id);

    const safety = await platform.recordSafetyEvent({
      childId: child.id,
      familyId: family.id,
      category: 'test-policy',
      policyVersion: 'ci-policy-v1',
      action: 'refuse',
      parentVisible: true
    });
    assert.ok(safety.id);

    const run = await platform.recordTutorRun({
      childId: child.id,
      familyId: family.id,
      question: 'How do volcanoes work?',
      promptVersion: 'ci-prompt-v1',
      modelRoute: 'curated',
      status: 'completed',
      latencyMs: 12,
      inputTokens: 10,
      outputTokens: 20,
      costMicros: 0,
      evidence: [{
        url: 'https://www.usgs.gov/faqs/how-do-volcanoes-erupt',
        title: 'How Do Volcanoes Erupt?',
        publisher: 'U.S. Geological Survey',
        quality: 0.99,
        snippet: 'Magma that reaches the surface is called lava.'
      }]
    });
    assert.ok(run.id);
  } finally {
    await platform.pool.query('delete from families where id in (select family_id from parent_accounts where email=$1)', [email]);
    await platform.pool.end();
  }
});
