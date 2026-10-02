import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAtlasGraph,
  edgeId,
  explainConnection,
  nodeId,
  normalizeTitle,
  scoreConnection,
  sharedCategories,
} from '../src/atlas.mjs';

const pages = new Map([
  ['Volcano', {
    title: 'Volcano', pageId: 1, summary: 'A rupture in the crust.',
    categories: ['Volcanology', 'Geology'],
    links: ['Magma', 'Lava', 'Plate tectonics', 'Earth'],
  }],
  ['Magma', {
    title: 'Magma', pageId: 2, summary: 'Molten material beneath the surface.',
    categories: ['Volcanology', 'Igneous petrology'],
    links: ['Volcano', 'Lava'],
  }],
  ['Lava', {
    title: 'Lava', pageId: 3, summary: 'Molten rock at the surface.',
    categories: ['Volcanology', 'Geology'],
    links: ['Volcano', 'Magma'],
  }],
  ['Plate tectonics', {
    title: 'Plate tectonics', pageId: 4, summary: 'Movement of lithospheric plates.',
    categories: ['Geology'], links: ['Earth', 'Volcano'],
  }],
  ['Earth', {
    title: 'Earth', pageId: 5, summary: 'The third planet from the Sun.',
    categories: ['Planets'], links: ['Plate tectonics'],
  }],
]);

function fakeClient() {
  return {
    calls: [],
    async fetchPage(title) {
      this.calls.push(title);
      const page = pages.get(title);
      if (!page) throw new Error(`missing fixture: ${title}`);
      return structuredClone(page);
    },
  };
}

test('normalizes deterministic graph ids', () => {
  assert.equal(normalizeTitle('  Plate__tectonics  '), 'Plate tectonics');
  assert.equal(nodeId('LAVA'), nodeId('lava'));
  assert.equal(edgeId('Volcano', 'Lava'), `${nodeId('Volcano')}->${nodeId('Lava')}`);
});

test('shared categories are normalized, unique and sorted', () => {
  assert.deepEqual(
    sharedCategories(['Category:Volcanology', 'Geology'], ['geology', 'Volcanology', 'Planets']),
    ['geology', 'Volcanology'],
  );
});

test('connection explanations disclose evidence and absent clickstream', () => {
  const evidence = { linkPosition: 'lead', sharedCategories: ['Volcanology'], clickstreamCount: null };
  const why = explainConnection({ sourceTitle: 'Volcano', targetTitle: 'Magma', evidence });
  assert.match(why, /introduction/i);
  assert.match(why, /Volcanology/);
  assert.match(why, /No clickstream weight is claimed/);
  assert.ok(scoreConnection(evidence) > scoreConnection({ linkPosition: 'article', sharedCategories: [] }));
});

test('clickstream counts are only reported when explicitly configured', async () => {
  const client = fakeClient();
  const graph = await buildAtlasGraph({
    seed: 'Volcano', maxNodes: 3, maxDepth: 1, maxRequests: 10, client,
    clickstream: { 'Volcano\tMagma': 12450 },
    linkPositions: { 'Volcano\tMagma': 'lead' },
  });
  const edge = graph.edges.find((item) => item.id === edgeId('Volcano', 'Magma'));
  assert.ok(edge);
  assert.equal(edge.evidence.clickstreamCount, 12450);
  assert.equal(edge.evidence.linkPosition, 'lead');
  assert.match(edge.why, /12,450 transitions/);
});

test('bounded crawl never exceeds node or request budgets', async () => {
  const client = fakeClient();
  const graph = await buildAtlasGraph({ seed: 'Volcano', maxNodes: 3, maxDepth: 2, maxRequests: 6, client });
  assert.ok(graph.nodes.length <= 3);
  assert.ok(graph.meta.upstreamRequests <= 6);
  assert.equal(graph.nodes[0].title, 'Volcano');
});

test('graph edges explain direct links and shared categories', async () => {
  const client = fakeClient();
  const graph = await buildAtlasGraph({ seed: 'Volcano', maxNodes: 4, maxDepth: 1, maxRequests: 10, client });
  const edge = graph.edges.find((item) => item.id === edgeId('Volcano', 'Lava'));
  assert.ok(edge);
  assert.equal(edge.evidence.directWikipediaLink, true);
  assert.ok(edge.evidence.sharedCategories.includes('Geology'));
  assert.match(edge.why, /directly links/i);
  assert.equal(graph.meta.clickstream, 'not configured');
});
