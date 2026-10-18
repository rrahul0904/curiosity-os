import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_HOME_VIEW, zoomAtlasView, panAtlasView, atlasClientToWorld, atlasViewBox } from '../public/atlas-viewport.js';

test('home view stays immutable under zoom and pan', () => {
  const home = { ...ATLAS_HOME_VIEW };
  zoomAtlasView(home, { x: 450, y: 310 }, 0.8);
  panAtlasView(home, 20, 40);
  assert.deepEqual(home, ATLAS_HOME_VIEW);
});

test('repeated zoom clamps to a finite range while retaining aspect ratio', () => {
  let view = { ...ATLAS_HOME_VIEW };
  for (let i = 0; i < 100; i += 1) view = zoomAtlasView(view, { x: 450, y: 310 }, 0.4);
  assert.equal(view.width, 180);
  assert.ok(view.height > 0);
  for (let i = 0; i < 100; i += 1) view = zoomAtlasView(view, { x: 450, y: 310 }, 3);
  assert.equal(view.width, 1800);
  assert.ok(Math.abs(view.height / view.width - 620 / 900) < 1e-10);
  assert.ok(Object.values(view).every(Number.isFinite));
});

test('zoom anchor stays at same fractional screen position away from edge clamp', () => {
  const anchor = { x: 525, y: 350 };
  const before = { ...ATLAS_HOME_VIEW };
  const after = zoomAtlasView(before, anchor, 0.75);
  assert.ok(Math.abs((anchor.x - before.x) / before.width - (anchor.x - after.x) / after.width) < 1e-12);
  assert.ok(Math.abs((anchor.y - before.y) / before.height - (anchor.y - after.y) / after.height) < 1e-12);
});

test('large pans are bounded to keep the canvas reachable', () => {
  const left = panAtlasView(ATLAS_HOME_VIEW, -1e6, -1e6);
  const right = panAtlasView(ATLAS_HOME_VIEW, 1e6, 1e6);
  assert.equal(left.x, -720);
  assert.equal(left.y, -496);
  assert.equal(right.x, 720);
  assert.equal(right.y, 496);
  assert.equal(panAtlasView(ATLAS_HOME_VIEW, Infinity, NaN).x, 0);
});

test('client-to-world position accounts for centered SVG letterboxing', () => {
  const world = atlasClientToWorld(ATLAS_HOME_VIEW, { left: 10, top: 20, width: 900, height: 900 }, 460, 470);
  assert.equal(world.x, 450);
  assert.equal(world.y, 310);
  const fallback = atlasClientToWorld(ATLAS_HOME_VIEW, { left: 0, top: 0, width: 0, height: 0 }, 10, 10);
  assert.deepEqual(fallback, { x: 450, y: 310 });
});

test('view box serializes numeric coordinates without unsafe markup', () => {
  assert.equal(atlasViewBox(ATLAS_HOME_VIEW), '0 0 900 620');
  assert.equal(atlasViewBox({ x: 12.123456, y: -2, width: 100, height: 80 }), '12.1235 -2 100 80');
});
