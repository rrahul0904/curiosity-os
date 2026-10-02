# RE-374 — Curiosity Atlas

## Decision

WikiCrawl is treated as a **capability donor**, not a product to clone. Curiosity OS already has the stronger product north star: turn curiosity into a persistent map of what a learner understands. Curiosity Atlas supplies the graph-exploration layer needed by that roadmap.

Canonical destination: `rrahul0904/curiosity-os`

Implementation branch: `feat/re374-curiosity-atlas`

Tracking issue: `#1`

## Public sources reviewed

- Reddit source supplied by the user: `r/IMadeThis` post “I built WikiCrawl - turn any Wikipedia article into an interactive knowledge graph”.
- Same-author Reddit discussions in `r/coolgithubprojects`, `r/SideProject`, and related communities.
- Live public demo: `https://wiki-crawl.vercel.app`.
- Public source repository: `https://github.com/Adityavardhanjain/WikiCrawl` (MIT at review time).
- MediaWiki Action API documentation for `prop=links`, `prop=categories`, and page properties.
- Wikimedia public Wikipedia Clickstream documentation and monthly dump contract.

## Observed donor behavior

The donor product accepts a Wikipedia topic, explores outgoing Wikipedia links under bounded depth/node limits, and renders a navigable graph. Its public repository documents server-sent crawl progress, Graphology analysis, Sigma rendering, ForceAtlas2 layout, incremental expansion, node inspection, shortest-path search, caching, rate limiting, tests, and CI.

This implementation does **not** claim donor parity. It intentionally starts with a smaller original slice that fits Curiosity OS.

## Community feedback incorporated

The highest-value feedback was not visual. Commenters repeatedly pushed the product from “show me that two pages connect” toward “tell me why these ideas connect.” Specific suggestions included:

1. Explain the relationship behind every edge.
2. Distinguish article-link placement such as lead, body, and “See also” because placement changes the meaning/strength of a link.
3. Use shared Wikipedia categories to expose semantic context.
4. Use Wikipedia clickstream counts to show which article transitions people actually make.
5. Preserve the dark exploratory feel while reducing graph ambiguity and improving mobile usability.

The current `r/IMadeThis` thread also contains positive feedback on the dark graph presentation; the author acknowledged that the current graph interaction is still somewhat rough. We keep the exploratory dark aesthetic but make evidence explanation a first-class side panel.

## Data-source findings

### MediaWiki page links

The Action API exposes outgoing page links through `prop=links`, with continuation and bounded result limits. Curiosity Atlas uses this as the only required edge fact in Phase A.

### MediaWiki categories

The Action API exposes categories through `prop=categories`. Curiosity Atlas intersects source/target categories and includes the result in both edge scoring and the human-readable explanation.

### Wikimedia clickstream

The public clickstream dataset contains monthly aggregated `(referrer, resource)` counts. It is useful as an edge-weight enrichment, but it is not treated as a low-latency per-request API. Phase A therefore defines an explicit clickstream evidence field/adapter contract and reports `not configured` unless a verified snapshot is supplied. No click counts are fabricated.

## Clean-room / license boundary

- Public behavior, documentation, user feedback, and API contracts were used as research evidence.
- No donor source file, component, CSS, asset, logo, product name, or copy was copied into Curiosity OS.
- The implementation is original Node/browser code designed around Curiosity OS constraints.
- The donor repository's MIT license is recorded only as source metadata; this slice does not depend on copying donor code.
- Wikipedia/Wikimedia content and data remain subject to their own terms/licenses; production UI should preserve appropriate source attribution when article content is displayed.

## Phase A implementation

### Backend

`src/atlas.mjs` adds:

- deterministic normalized concept and edge IDs;
- a bounded Wikipedia Action API client;
- explicit request/node/depth budgets;
- graph construction with partial-result warnings;
- direct-link evidence;
- shared-category evidence;
- optional `linkPosition` and `clickstreamCount` evidence contracts;
- transparent edge scoring;
- human-readable “why this connects” explanations;
- `POST /api/atlas` integration.

### Browser explorer

`public/atlas.html`, `public/atlas.js`, and `public/atlas.css` add:

- seed-topic input;
- 1–2 hop and node-budget controls;
- a responsive dark SVG graph with no external visualization dependency;
- keyboard-selectable graph nodes;
- concept summaries/categories;
- connection inspector showing the exact edge explanation and evidence score;
- partial-result/error messaging;
- an explicit evidence contract explaining what the lines do and do not mean.

The main CurioSky navigation links to the new Atlas page.

### Tests

`tests/atlas.test.mjs` covers:

- deterministic title/node/edge normalization;
- shared-category normalization;
- explainability and disclosure of missing clickstream evidence;
- explicit clickstream/link-placement enrichment;
- node/request budgets;
- direct-link and shared-category edge evidence.

## Deferred slices

### Phase B — stronger relationship evidence

- Parse rendered/article structure to classify links as lead/body/See-also with source receipts.
- Create a reproducible monthly Wikimedia clickstream ingestion/index pipeline with versioned dataset receipts.
- Add incoming links/backlinks and Wikidata identifiers where useful.
- Add edge provenance UI with source URLs and enrichment timestamps.

### Phase C — learner graph

- Project explored Wikipedia concepts into a learner-owned concept graph only after comprehension evidence exists.
- Keep “explored”, “understood”, and “mastered” as separate states.
- Attach quiz/mastery events immutably and schedule adaptive review from evidence rather than mere browsing.
- Add misconception relationships and parent-facing progress summaries without surveillance-style browsing logs.

### Phase D — production hardening

- Persistent distributed cache and request throttling.
- Search/autocomplete instead of raw title-only entry.
- Browser/mobile accessibility certification.
- Network failure/timeout chaos tests.
- Hosted preview and exact-SHA deployment verification.

## Truthful status

Phase A is an implementation candidate. It must pass repository CI and browser/runtime verification before its tracker status advances beyond “implementation started / verification pending.” No production-readiness or WikiCrawl-parity claim is made.
