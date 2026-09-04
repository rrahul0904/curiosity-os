# CurioSky Project Plan

## Objective
Build a safe curiosity-driven learning platform where children ask questions, understand concepts, demonstrate recall, accumulate a visible knowledge universe, and revisit material before it fades. Parents receive actionable learning and safety visibility without turning the product into surveillance.

## Principles
1. Learning, not endless chat.
2. Evidence over confidence.
3. Safety before generation.
4. Child privacy by default.
5. Mastery is the durable product asset.
6. Parents get actions, not vanity analytics.
7. Model/cloud/payment providers remain adapters.

## Personas
- **Child learner** — asks questions, receives age-aware explanation, earns knowledge stars.
- **Parent/guardian** — manages consent, profile, limits, rewards, learning and safety visibility.
- **Safety/operations admin** — monitors policy, model quality, evidence, cost and incidents.

## MVP
- safe question intake
- lesson + quiz + remediation
- stars/constellations
- mastery + forgetting/review
- Stardust
- parent dashboard
- tests/CI/containerization

## Production scope
- parent auth + verified parental consent
- child handle/PIN/device sessions
- PostgreSQL + migrations + authorization
- moderation/policy service
- evidence retrieval + answer verification
- adaptive mastery/FSRS-style review
- subscriptions/entitlements
- child mobile apps
- parent/admin web
- observability + cost intelligence

## Success metrics
Learning: completed learning loops, quiz accuracy, 7/30-day recall, reviews, graph growth.
Safety: catch rate, false positives, escalation completion, PII incidents, regression rate.
Product: activated families, weekly sessions, parent usefulness, conversion, retention.
Economics: model cost per completed loop, infra cost per active family, contribution margin.

## Delivery rule
A phase is complete only when code, tests, docs, telemetry and rollback behavior exist. Safety-critical releases require evaluation coverage.
