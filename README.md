# CurioSky / Curiosity OS

CurioSky is an original, safe-by-design AI learning product for children and families. It turns a child's question into an age-aware lesson, a comprehension check, a persistent knowledge star, an adaptive review event, and useful parent visibility.

> This repository is an original implementation inspired by the broader curiosity-learning product category. It does not contain HowComet source code, proprietary assets, copied branding, or private implementation details.

## Product north star

**Turn every moment of childhood curiosity into a persistent, evolving map of what the child understands.**

```text
Ask → Safety → Evidence → Explain → Check Understanding → Earn Star
    → Update Mastery → Schedule Review → Parent Insight
```

## Current status

### Phase 0 — executable product foundation ✅
Child Ask, My Sky, parent dashboard, quiz/remediation, stars/mastery/review, Stardust/rewards, demo API, tests, Docker and CI.

### Phase 1 — production data + identity foundation ✅
PostgreSQL migrations/adapter, parent registration/login, scrypt credential hashing, signed parent/child sessions, versioned parental consent, child handles/PIN login, family/role authorization, audit/safety persistence.

### Phase 2 — evidence intelligence foundation ✅
Evidence-first tutor orchestration, trusted-source allowlist, USGS/NASA evidence examples, optional evidence-search adapter, model generation only with sufficient evidence, safe uncertainty fallback, model/cost/latency/evidence traces.

See `docs/PHASE_1_2_IMPLEMENTATION.md`.

## Zero-config run

Requires Node.js 22+.

```bash
node server.mjs
```

Open http://localhost:3000.

## Full PostgreSQL stack

```bash
docker compose up --build
```

The container applies migrations before starting the app.

## Direct development

```bash
npm install
npm test
npm run check
npm run db:migrate   # DATABASE_URL required
npm start
```

## Next phase

Phase 3/4 turns this foundation into the durable learner control plane: **dedicated safety control plane + concept graph + immutable mastery events + persisted production assessments + adaptive review + misconception intelligence + parent insights.**
