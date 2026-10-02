const DEFAULTS = Object.freeze({
  maxNodes: 14,
  maxDepth: 1,
  maxRequests: 24,
  timeoutMs: 7000,
  maxLinksPerPage: 24,
});

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

export function normalizeTitle(value) {
  return String(value ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function nodeId(title) {
  return `wiki:${encodeURIComponent(normalizeTitle(title).toLocaleLowerCase('en-US'))}`;
}

export function edgeId(sourceTitle, targetTitle) {
  return `${nodeId(sourceTitle)}->${nodeId(targetTitle)}`;
}

function cleanCategory(value) {
  return normalizeTitle(value).replace(/^Category:/i, '');
}

function categoryKey(value) {
  return cleanCategory(value).toLocaleLowerCase('en-US');
}

export function sharedCategories(sourceCategories = [], targetCategories = []) {
  const right = new Map(targetCategories.map((value) => [categoryKey(value), cleanCategory(value)]));
  const shared = [];
  for (const value of sourceCategories) {
    const match = right.get(categoryKey(value));
    if (match && !shared.some((item) => categoryKey(item) === categoryKey(match))) shared.push(match);
  }
  return shared.sort((a, b) => a.localeCompare(b)).slice(0, 6);
}

export function scoreConnection(evidence = {}) {
  const positionWeight = { lead: 34, see_also: 30, body: 22, article: 18, unknown: 14 };
  let score = positionWeight[evidence.linkPosition] ?? positionWeight.unknown;
  score += Math.min(30, (evidence.sharedCategories?.length ?? 0) * 8);
  if (Number.isFinite(evidence.clickstreamCount) && evidence.clickstreamCount > 0) {
    score += Math.min(30, Math.round(Math.log10(evidence.clickstreamCount + 1) * 8));
  }
  return Math.min(100, Math.max(1, score));
}

export function explainConnection({ sourceTitle, targetTitle, evidence = {} }) {
  const reasons = [];
  const position = evidence.linkPosition ?? 'article';
  if (position === 'lead') reasons.push(`${targetTitle} is linked from the introduction of ${sourceTitle}.`);
  else if (position === 'see_also') reasons.push(`${targetTitle} appears in the “See also” context for ${sourceTitle}.`);
  else if (position === 'body') reasons.push(`${sourceTitle} links to ${targetTitle} in the article body.`);
  else reasons.push(`${sourceTitle} directly links to ${targetTitle} on Wikipedia.`);

  const categories = evidence.sharedCategories ?? [];
  if (categories.length) {
    const sample = categories.slice(0, 3).join(', ');
    reasons.push(`They share ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}, including ${sample}.`);
  }

  if (Number.isFinite(evidence.clickstreamCount) && evidence.clickstreamCount > 0) {
    reasons.push(`The configured Wikimedia clickstream snapshot records ${Math.round(evidence.clickstreamCount).toLocaleString('en-US')} transitions from ${sourceTitle} to ${targetTitle}.`);
  }

  if (evidence.clickstreamCount == null) reasons.push('No clickstream weight is claimed for this edge.');
  return reasons.join(' ');
}

function makeAbortSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, stop: () => clearTimeout(timer) };
}

export function createWikipediaClient({ fetchImpl = globalThis.fetch, timeoutMs = DEFAULTS.timeoutMs } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation required');
  return {
    async fetchPage(title, { maxLinks = DEFAULTS.maxLinksPerPage } = {}) {
      const cleanTitle = normalizeTitle(title);
      if (!cleanTitle) throw new Error('Wikipedia title is required');
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        formatversion: '2',
        redirects: '1',
        prop: 'links|categories|extracts',
        titles: cleanTitle,
        plnamespace: '0',
        pllimit: String(clampInteger(maxLinks, 1, 50, DEFAULTS.maxLinksPerPage)),
        cllimit: '50',
        clshow: '!hidden',
        exintro: '1',
        explaintext: '1',
        exsectionformat: 'plain',
      });
      const { signal, stop } = makeAbortSignal(timeoutMs);
      let response;
      try {
        response = await fetchImpl(`https://en.wikipedia.org/w/api.php?${params}`, {
          headers: { 'user-agent': 'CuriosityOS-CuriosityAtlas/0.1 (+https://github.com/rrahul0904/curiosity-os)' },
          signal,
        });
      } finally {
        stop();
      }
      if (!response?.ok) throw new Error(`Wikipedia request failed (${response?.status ?? 'network'})`);
      const payload = await response.json();
      const page = payload?.query?.pages?.[0];
      if (!page || page.missing) throw new Error(`Wikipedia page not found: ${cleanTitle}`);
      return {
        title: normalizeTitle(page.title),
        pageId: page.pageid ?? null,
        summary: String(page.extract ?? '').trim().slice(0, 1200),
        categories: (page.categories ?? []).map((item) => cleanCategory(item.title)).filter(Boolean),
        links: (page.links ?? []).map((item) => normalizeTitle(item.title)).filter(Boolean),
      };
    },
  };
}

function mapLookup(mapLike, sourceTitle, targetTitle) {
  if (!mapLike) return undefined;
  const exact = `${normalizeTitle(sourceTitle)}\t${normalizeTitle(targetTitle)}`;
  const lower = exact.toLocaleLowerCase('en-US');
  if (mapLike instanceof Map) return mapLike.get(exact) ?? mapLike.get(lower);
  return mapLike[exact] ?? mapLike[lower];
}

function nodeFromPage(page, depth) {
  return {
    id: nodeId(page.title),
    title: page.title,
    pageId: page.pageId ?? null,
    summary: page.summary ?? '',
    categories: [...(page.categories ?? [])].slice(0, 12),
    depth,
  };
}

export async function buildAtlasGraph({
  seed,
  maxNodes = DEFAULTS.maxNodes,
  maxDepth = DEFAULTS.maxDepth,
  maxRequests = DEFAULTS.maxRequests,
  client = createWikipediaClient(),
  clickstream = null,
  linkPositions = null,
} = {}) {
  const cleanSeed = normalizeTitle(seed);
  if (!cleanSeed) throw new Error('seed is required');
  const nodeLimit = clampInteger(maxNodes, 3, 40, DEFAULTS.maxNodes);
  const depthLimit = clampInteger(maxDepth, 1, 2, DEFAULTS.maxDepth);
  const requestLimit = clampInteger(maxRequests, 3, 60, DEFAULTS.maxRequests);

  const nodes = new Map();
  const edges = new Map();
  const warnings = [];
  const queue = [{ title: cleanSeed, depth: 0 }];
  const queued = new Set([nodeId(cleanSeed)]);
  let requests = 0;
  let partial = false;

  while (queue.length && nodes.size < nodeLimit) {
    const current = queue.shift();
    if (current.depth > depthLimit || nodes.has(nodeId(current.title))) continue;
    if (requests >= requestLimit) {
      partial = true;
      warnings.push(`Request budget of ${requestLimit} reached; returning a partial graph.`);
      break;
    }

    let page;
    requests += 1;
    try {
      page = await client.fetchPage(current.title, { maxLinks: DEFAULTS.maxLinksPerPage });
    } catch (error) {
      partial = true;
      warnings.push(`${current.title}: ${error.message}`);
      continue;
    }

    nodes.set(nodeId(page.title), nodeFromPage(page, current.depth));
    if (current.depth >= depthLimit) continue;

    for (const targetTitle of page.links) {
      if (nodes.size + queue.length >= nodeLimit) break;
      const targetKey = nodeId(targetTitle);
      if (!queued.has(targetKey) && !nodes.has(targetKey)) {
        queue.push({ title: targetTitle, depth: current.depth + 1 });
        queued.add(targetKey);
      }
    }
  }

  const pages = [...nodes.values()];
  const pageById = new Map(pages.map((page) => [page.id, page]));

  for (const source of pages) {
    let sourcePage;
    if (requests >= requestLimit) {
      partial = true;
      break;
    }
    requests += 1;
    try {
      sourcePage = await client.fetchPage(source.title, { maxLinks: DEFAULTS.maxLinksPerPage });
    } catch (error) {
      partial = true;
      warnings.push(`${source.title} edge scan: ${error.message}`);
      continue;
    }

    for (const targetTitle of sourcePage.links) {
      const target = pageById.get(nodeId(targetTitle));
      if (!target || target.id === source.id) continue;
      const key = edgeId(source.title, target.title);
      if (edges.has(key)) continue;
      const common = sharedCategories(source.categories, target.categories);
      const configuredClicks = mapLookup(clickstream, source.title, target.title);
      const clicks = Number.isFinite(Number(configuredClicks)) ? Number(configuredClicks) : null;
      const configuredPosition = mapLookup(linkPositions, source.title, target.title);
      const linkPosition = ['lead', 'body', 'see_also', 'article'].includes(configuredPosition) ? configuredPosition : 'article';
      const evidence = {
        directWikipediaLink: true,
        linkPosition,
        sharedCategories: common,
        clickstreamCount: clicks,
      };
      edges.set(key, {
        id: key,
        source: source.id,
        target: target.id,
        score: scoreConnection(evidence),
        why: explainConnection({ sourceTitle: source.title, targetTitle: target.title, evidence }),
        evidence,
      });
    }
  }

  return {
    seed: pages.find((node) => node.depth === 0)?.title ?? cleanSeed,
    nodes: pages,
    edges: [...edges.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)),
    meta: {
      partial,
      warnings: [...new Set(warnings)].slice(0, 12),
      maxNodes: nodeLimit,
      maxDepth: depthLimit,
      maxRequests: requestLimit,
      upstreamRequests: requests,
      edgeSemantics: 'Direct Wikipedia links enriched only by evidence actually available to this request.',
      clickstream: clickstream ? 'configured snapshot' : 'not configured',
      linkPositions: linkPositions ? 'configured evidence' : 'not configured; generic article-link evidence only',
    },
  };
}

export function createAtlasHandler({ send, bodyJson, fetchImpl = globalThis.fetch } = {}) {
  if (typeof send !== 'function' || typeof bodyJson !== 'function') throw new TypeError('send and bodyJson are required');
  const client = createWikipediaClient({ fetchImpl });
  return async function handleAtlas(req, res, url) {
    if (req.method !== 'POST' || url.pathname !== '/api/atlas') return false;
    const body = await bodyJson(req);
    const seed = normalizeTitle(body.seed);
    if (!seed) {
      send(res, 400, { error: 'seed is required' });
      return true;
    }
    const graph = await buildAtlasGraph({
      seed,
      maxNodes: body.maxNodes,
      maxDepth: body.maxDepth,
      maxRequests: body.maxRequests,
      client,
    });
    send(res, 200, graph);
    return true;
  };
}

export { DEFAULTS as ATLAS_DEFAULTS };
