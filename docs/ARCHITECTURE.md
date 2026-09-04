# Technical Architecture

```text
Child Mobile/Web                 Parent Web
       |                            |
       +----------- API ------------+
                   |
            Identity / Consent
                   |
              Safety Gateway
            /      |       \
        policy   PII guard  rate limit
            \      |       /
             Tutor Orchestrator
          /          |          \
   Curated KB     Model GW    Evidence/RAG
          \          |          /
          Structured Tutor Artifact
                   |
              Assessment
                   |
             Learner Engine
          /                 \
   Knowledge Graph      Review Scheduler
          \                 /
              PostgreSQL
                   |
            Parent Intelligence
                   |
         Admin / Safety Operations
```

## Prototype
Node 22 native HTTP + browser HTML/CSS/JS + atomic JSON + curated lessons + optional OpenAI-compatible gateway. Zero runtime npm dependencies.

## Production services
Identity/consent; Tutor; Safety; Assessment; Learner graph; Review; Reward ledger; Parent intelligence; Admin operations.

## Technology direction
- child mobile: React Native + Expo
- parent/admin: Next.js
- API: TypeScript/Node or FastAPI behind OpenAPI
- database: PostgreSQL
- cache/rate limit: Redis
- async: queue + stateless workers
- storage: S3-compatible for approved artifacts
- AI: provider-neutral gateway
- evidence: retrieval adapters + pgvector only where justified
- telemetry: OpenTelemetry
- deployment: Docker first; Vercel/Kubernetes/cloud/VPC capable

## Scale
Stateless APIs; PostgreSQL source of truth; partition high-volume immutable events; queue AI/evidence/notification work; separate parent identifying data from child learning content.
