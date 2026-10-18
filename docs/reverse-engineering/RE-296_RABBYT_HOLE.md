# REA-296 — Rabbyt Hole → Curiosity Atlas (2026-10-18)

## Identity and decision
- Input short URL: https://www.reddit.com/r/secondbrain/s/VwZOX50Ixb
- Canonical post: https://www.reddit.com/r/secondbrain/comments/1x6u6rj/new_way_to_learn/
- Creator: u/Rabbytholes (self-described solo creator); official profile website: https://rabbytholes.com
- Governance: https://github.com/rrahul0904/agent-work-os/issues/296
- Product owner: https://github.com/rrahul0904/curiosity-os
- Adjacent existing initiative: Curiosity Atlas, https://github.com/rrahul0904/curiosity-os/issues/1; implementation base: feat/re374-curiosity-atlas
- **Disposition: DONOR/EXTENSION, not new product or repository.** No upstream source-code import.

## Evidence ledger (source-backed vs inferred vs unknown)
| Claim | Status | Evidence |
|---|---|---|
| Creator calls it a freely zoomable hierarchy search engine | OBSERVED description | r/secondbrain post 1x6u6rj |
| Visual curiosity is intended to guide discovery | OBSERVED description | same post |
| Knowledge map demonstration includes Law, Video Games, Sports, Medicine, Research, Wiki, Civilization and Books, Directory, Insight | OBSERVED Reddit media description | same post |
| Creator profile links rabbytholes.com | OBSERVED profile | https://www.reddit.com/user/Rabbytholes/ |
| Related product posts call it an ontology search engine | OBSERVED author cross-post title | https://www.reddit.com/r/Microlaunch/comments/1x6swfb/freely_zoomable_hierarchy_ontology_search_engine/ |
| Web app was live and features operated as described | UNVERIFIED | Site fetch did not succeed through available inspection tools; Reddit is a product claim, not a hands-on QA receipt |
| A proprietary or open-source frontend framework, LLM, embeddings, graph database, SEO index, crawler, native app, offline cache or specific algorithm is used | UNKNOWN | No code evidence |
| License, privacy policy, subscription pricing, official terms, user data policy, infrastructure and auth model | UNKNOWN | No site inspection or public source verified |

## What the reference teaches
A user should be able to go from one topic to adjacent categories while retaining spatial context, smoothly inspect individual concepts and change depth of exploration without losing orientation. This contrasts with flat search-result lists. The public media does not establish whether the original interaction is a tree, DAG, knowledge graph, or taxonomic index underneath the visuals.

## Our existing baseline and delta
**Already implemented on Curiosity Atlas feature branch:**
- bounded Wikimedia page-link discovery and deterministic nodes/edges;
- source-backed human-readable edge explanations;
- confidence/evidence disclosure, budget warnings and a concept inspector;
- static SVG ring layout and keyboard-selectable concept nodes.

**Gap extracted from Rabbyt Hole:**
- smooth continuous user-controlled zoom and pan while inspecting the same graph;
- explicit reset / zoom controls and keyboard interaction;
- later: stable topic breadcrumbs, dynamic level-of-detail, navigate/search within graph, bounded expansion, search result evidence.

### Roadmap
**P0 (this draft PR):** independent viewport math; bounded zoom; wheel modifier zoom; background drag-pan; keyboard arrows/+/−/Home; buttons/reset; preserve deterministic graph IDs and evidence panel. Automated unit tests for geometry only. No remote integration changes.

**P1:** rooted ontology navigation with explicit taxonomic vs factual-link edge labels, focus context, breadcrumbs, lazy neighborhood expansion, and scoped source citations. Avoid claiming Wikimedia edges are hierarchical when they are merely hyperlinks.

**P2:** saved paths and personal concept exploration with opt-in consent, learner-owned map separated from mastery events; do not infer understanding from browsing. Privacy-safe parent summaries.

**P3:** search adapters, accessibility and device matrix, perf telemetry with privacy guards, large-graph LOD/virtualization, hosted/browser/multiplatform certification.

### Proposed clean-room architecture

    Question / curated source → authorized bounded discovery → ConceptGraph(IR)
                                       |                   |
                                       |                   → Edges: type/evidence/source/score
                                       → Atlas API budget controls
                                                   |
                                         Deterministic SVG scene
                                                   |
                                     ViewportController(pan/zoom/reset)
                                                   |
                          Inspect node / parent-aware path / cited evidence

Keep the graph model and viewport separate. Pure math unit tests should not depend on browser globals. Interaction layer cannot mutate nodes, underlying evidence, learner mastery, or remote data.

### Platform and product strategy
Web-first responsive Curiosity Atlas. Browser controls work via Pointer Events and keyboard; iOS Safari, Android Chrome, desktop mouse/trackpad, screen-reader and touch-gesture certification are pending. No iOS/Android/macOS/Windows native release claim. No new repo until there is evidence for independent adult/general-purpose product positioning, distinct commercial lifecycle and ownership.

### Competitive angle
- Rabbyt Hole: product claims free spatial zoom and cross-domain ontology discovery. Its actual data provenance and evidence guarantees are unknown.
- WikiCrawl donor: Wikipedia graph discovery and graph UX, referenced in existing Atlas dossier.
- Curiosity Atlas owned differentiation: source-backed explanations, strict network budgets, age-aware safety boundary, and (later) comprehension/mastery distinction. Spatial navigation is the explicitly missing UX.

### IP and safeguards
Rabbyt Hole should be treated as closed source unless an explicit component license is established. Never import its site code, branding, media, styles, or confidential/private endpoints. This PR uses original code and no product-site assets. Respect Wikimedia terms and source attribution for any reused open public content. Avoid automated signups, access-control bypass, uncontrolled crawling, and third-party writes.

### Verification and status
- [x] Reddit canonical post and author-profile link resolved.
- [x] Repo owner and prior Atlas work de-duplicated.
- [x] Clean-room implementation boundaries documented.
- [ ] Geometry/unit tests on new exact commit head.
- [ ] Complete repository CI on new exact commit head.
- [ ] Human review of keyboard/touch/drag behavior on an actual browser.
- [ ] Verified iOS/Android + desktop matrix.
- [ ] Hosted demo and deployment receipts.
- [ ] Source site/license direct validation.

**Status:** research recorded + implementation candidate, not feature parity or production complete. Keep as draft PR; do not merge or deploy without gate.
