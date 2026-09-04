# Phase 1 + 2 Implementation — Production Identity, PostgreSQL and Evidence Intelligence

## Delivered

### Production identity contracts

The new `/v1` surface adds:

- parent registration
- parent login
- signed parent sessions
- versioned parental consent
- child profile creation only after active consent
- child handles and scrypt-hashed PINs
- signed child sessions
- family/role authorization guards
- consent re-check before tutor use

The legacy `/api` surface remains available as a zero-configuration product demo.

### PostgreSQL

When `DATABASE_URL` is configured, `/v1` uses PostgreSQL automatically for families, parent accounts, consent, children, tutor runs, evidence references, safety events, and audit events.

The JSON platform store implements the same identity/tutor-store contract for local tests and demos.

```bash
npm install
npm run db:migrate
```

Or run the complete PostgreSQL stack:

```bash
docker compose up --build
```

### Evidence intelligence

```text
authenticated child
      ↓
active-consent check
      ↓
input safety policy
      ↓
trusted evidence retrieval
      ↓
curated lesson OR grounded model generation
      ↓
structured-output validation
      ↓
privacy-safe tutor-run economics/trace
```

Trusted curated evidence currently demonstrates USGS evidence for volcano/magma/lava questions and NASA Science evidence for Moon-phase questions.

An optional remote evidence adapter accepts search results but rejects sources outside the trusted-domain allowlist.

### AI routing

Open-ended generation is only attempted when approved evidence is sufficient. Without evidence or model configuration, the system fails safely to an uncertainty-oriented learning response instead of inventing facts.

Tutor-run traces persist prompt version, route/model, status, latency, token usage/estimate, estimated cost micros, and approved evidence references.

## Still intentionally deferred

The next learner-intelligence wave should add relational concepts/edges, persisted production assessments, immutable mastery events, adaptive review state, misconception tracking, parent intelligence derived from learner events, safety operations/admin UI, output moderation, and age-appropriateness classifiers.
