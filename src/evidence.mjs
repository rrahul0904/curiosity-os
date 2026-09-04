const CURATED = [
  {
    match: /volcano|lava|magma/i,
    refs: [{
      id: 'usgs-volcano-eruptions',
      title: 'How Do Volcanoes Erupt?',
      publisher: 'U.S. Geological Survey',
      url: 'https://www.usgs.gov/faqs/how-do-volcanoes-erupt',
      quality: 0.99,
      snippet: 'Magma rises through Earth and magma that reaches the surface is called lava.'
    }]
  },
  {
    match: /moon.*phase|phase.*moon/i,
    refs: [{
      id: 'nasa-moon-phases',
      title: 'Moon Phases',
      publisher: 'NASA Science',
      url: 'https://science.nasa.gov/moon/moon-phases/',
      quality: 0.99,
      snippet: 'The Sun always illuminates half of the Moon; our view of the illuminated half changes as the Moon orbits Earth.'
    }]
  }
];

const DEFAULT_TRUSTED = ['usgs.gov', 'nasa.gov', 'science.nasa.gov', 'nih.gov', 'cdc.gov', 'noaa.gov', 'si.edu', 'edu'];

function domainAllowed(url, allowlist) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowlist.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function curatedEvidence(question) {
  return CURATED.flatMap((item) => item.match.test(String(question)) ? item.refs : []);
}

export function normalizeEvidence(item, allowlist = DEFAULT_TRUSTED) {
  if (!item || !domainAllowed(item.url, allowlist)) return null;
  const quality = Math.max(0, Math.min(1, Number(item.quality ?? 0.5)));
  return {
    id: String(item.id ?? `ref-${Math.random().toString(16).slice(2)}`).slice(0, 100),
    title: String(item.title ?? 'Evidence source').slice(0, 200),
    publisher: String(item.publisher ?? 'Unknown publisher').slice(0, 120),
    url: String(item.url).slice(0, 1000),
    quality,
    snippet: String(item.snippet ?? '').replace(/\s+/g, ' ').trim().slice(0, 900)
  };
}

export function evidenceSufficient(refs) {
  return Array.isArray(refs) && refs.some((ref) => ref.quality >= 0.75 && ref.snippet.length >= 30);
}

export function evidenceContext(refs) {
  return refs.slice(0, 5).map((ref, index) =>
    `[E${index + 1}] ${ref.publisher} — ${ref.title}\n${ref.snippet}\n${ref.url}`
  ).join('\n\n');
}

export async function searchEvidence(question) {
  const local = curatedEvidence(question);
  const remoteUrl = process.env.EVIDENCE_SEARCH_URL;
  if (!remoteUrl) return local;

  const response = await fetch(remoteUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.EVIDENCE_SEARCH_API_KEY ? { authorization: `Bearer ${process.env.EVIDENCE_SEARCH_API_KEY}` } : {})
    },
    body: JSON.stringify({ query: String(question).slice(0, 500), maxResults: 5 }),
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) return local;
  const payload = await response.json();
  const allowlist = String(process.env.TRUSTED_EVIDENCE_DOMAINS ?? DEFAULT_TRUSTED.join(','))
    .split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const remote = (payload.results ?? []).map((item) => normalizeEvidence(item, allowlist)).filter(Boolean);
  const byUrl = new Map([...local, ...remote].map((ref) => [ref.url, ref]));
  return [...byUrl.values()].sort((a, b) => b.quality - a.quality).slice(0, 5);
}
