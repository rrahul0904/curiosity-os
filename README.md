# CurioSky / Curiosity OS

CurioSky is an original, safe-by-design AI learning product for children and families. It turns a child's question into an age-aware lesson, a comprehension check, a persistent knowledge star, an adaptive review event, and useful parent visibility.

> This repository is an original implementation inspired by the broader curiosity-learning product category. It does not contain HowComet source code, proprietary assets, copied branding, or private implementation details.

## Product north star

**Turn every moment of childhood curiosity into a persistent, evolving map of what the child understands.**

```text
Ask → Safety Gate → Explain → Check Understanding → Earn Star
    → Update Mastery → Schedule Review → Parent Insight
```

## Initial implementation

- Child curiosity home
- Age/grade-aware lesson contract
- Text + browser speech input
- Safety pre-filter and parent-visible safety events
- Curated offline lessons
- Optional AI Gateway adapter
- Quiz/remediation
- Knowledge stars and constellations
- Mastery/freshness + review scheduling
- Stardust learning rewards
- Parent dashboard + family rewards
- Atomic local JSON persistence
- Health/API endpoints
- Node tests, Docker and GitHub Actions CI

## Run

Requires Node.js 22+.

```bash
node server.mjs
# open http://localhost:3000
```

No package installation is required for the baseline.

## Test

```bash
npm test
npm run check
```

## Optional live AI

The curated demo works without an AI key. For open-ended tutor generation, configure `AI_GATEWAY_API_KEY` and `AI_GATEWAY_MODEL`. Unknown questions fail safely when no model is configured rather than fabricating facts.

## Repository map

```text
public/   child + parent web experience
src/      safety, AI, knowledge and persistence domain logic
data/     prototype datastore
tests/    unit + HTTP integration tests
docs/     PRD, architecture, implementation, security, data and cost plans
```

Start with `docs/PROJECT_PLAN.md` and `docs/IMPLEMENTATION_PLAN.md`.
