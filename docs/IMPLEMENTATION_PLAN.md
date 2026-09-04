# End-to-End Implementation Plan

## Phase 0 — Executable foundation
**Implemented here:** child/parent UI, safety filter, curated + optional AI tutor, quiz/remediation, stars, mastery/review, Stardust, local persistence, tests, Docker and CI.

## Phase 1 — Production data and identity
PostgreSQL, migrations, parent auth, verified parental consent, child profiles, child PIN/device sessions, RBAC/ABAC, audit events, export/deletion.

## Phase 2 — AI + evidence intelligence
Provider-neutral gateway, prompt registry, structured outputs, evidence adapters, claim/evidence links, source-quality scoring, verification, budgets, fallbacks and offline evals.

## Phase 3 — Safety control plane
Input moderation, PII redaction, output moderation, age classifier, policy engine, parent alerts, admin safety queue, policy versions and high-risk regression corpus.

## Phase 4 — Learner intelligence
Concept taxonomy/graph, mastery event stream, misconception tracking, adaptive/FSRS-style review and next-best-learning suggestions.

## Phase 5 — Production UX
React Native/Expo child apps; Next.js parent/admin; accessibility; voice/read-aloud; structured visual lesson renderer; offline reviews.

## Phase 6 — Commercialization
Store billing/entitlement abstraction, family plans, trial, webhooks, cancellation, notifications and lifecycle messaging.

## Phase 7 — Scale/hardening
Queue workers, Redis/rate limits, partitioned events, OpenTelemetry, SLOs, load/chaos tests, backup/restore drills and security/privacy review.

## Stable domain contract
```text
Question → SafetyDecision → TutorArtifact → AssessmentAttempt
         → Concept/MasteryEvent → ReviewSchedule → ParentInsight
```
