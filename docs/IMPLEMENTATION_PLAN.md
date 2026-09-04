# End-to-End Implementation Plan

## Phase 0 — Executable foundation
**Status: complete**

Child/parent UI, safety filter, curated + optional AI tutor, quiz/remediation, stars, mastery/review, Stardust, local persistence, tests, Docker and CI.

## Phase 1 — Production data and identity
**Status: implemented foundation**

Delivered:
- PostgreSQL schema/migrations and adapter
- parent registration/login
- scrypt password/PIN hashes
- signed parent/child sessions
- versioned parental consent
- child profiles/handles
- family/role authorization guards
- audit-event table
- Docker PostgreSQL stack

Remaining hardening: external adult identity/OIDC/email verification, session revocation/device registry, consent revocation UI/workflow, export/deletion jobs, production secrets/key management.

## Phase 2 — AI + evidence intelligence
**Status: implemented foundation**

Delivered:
- provider-neutral OpenAI-compatible gateway boundary
- grounded prompt version
- trusted evidence catalog
- optional evidence-search adapter
- trusted-domain allowlist
- evidence sufficiency gate
- structured lesson validation
- safe uncertainty fallback
- tutor-run evidence/cost/latency traces

Remaining hardening: claim-level evidence mapping, output moderation/age classifier, evidence freshness/canonicalization service, model fallback/routing policy, factuality/hallucination benchmark.

## Phase 3 — Safety control plane
Next: PII redaction, dedicated moderation, output moderation, age classifier, policy engine, parent alerts, admin safety queue, policy versions and high-risk regression corpus.

## Phase 4 — Learner intelligence
Concept taxonomy/graph, immutable mastery events, misconception tracking, adaptive/FSRS-style review and next-best-learning suggestions.

## Phase 5 — Production UX
React Native/Expo child apps; Next.js parent/admin; accessibility; voice/read-aloud; structured visual lesson renderer; offline reviews.

## Phase 6 — Commercialization
Store billing/entitlement abstraction, family plans, trial, webhooks, cancellation, notifications and lifecycle messaging.

## Phase 7 — Scale/hardening
Queue workers, Redis/rate limits, partitioned events, OpenTelemetry, SLOs, load/chaos tests, backup/restore drills and security/privacy review.

## Stable domain contract

```text
Question → SafetyDecision → EvidenceSet → TutorArtifact
         → AssessmentAttempt → Concept/MasteryEvent
         → ReviewSchedule → ParentInsight
```
