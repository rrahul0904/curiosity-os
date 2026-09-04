import test from 'node:test';
import assert from 'node:assert/strict';
import { curatedEvidence, evidenceSufficient, normalizeEvidence, evidenceContext } from '../src/evidence.mjs';

test('volcano and moon topics carry high-quality evidence', () => {
  const volcano=curatedEvidence('Why does magma become lava in a volcano?');
  assert.equal(volcano[0].publisher,'U.S. Geological Survey');
  assert.equal(evidenceSufficient(volcano),true);
  const moon=curatedEvidence('Why does the Moon have phases?');
  assert.equal(moon[0].publisher,'NASA Science');
});

test('remote evidence is rejected outside the trusted-domain allowlist', () => {
  assert.equal(normalizeEvidence({url:'https://example.com/blog',title:'x',snippet:'x'.repeat(100),quality:1}),null);
  const ok=normalizeEvidence({url:'https://science.nasa.gov/moon/moon-phases/',title:'Moon',publisher:'NASA',snippet:'a'.repeat(100),quality:0.9});
  assert.equal(ok.quality,0.9);
  assert.match(evidenceContext([ok]),/\[E1\]/);
});
