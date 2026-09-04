# Cost and Observability

Every tutor run should emit privacy-safe quality/cost telemetry: trace ID, opaque child/family ID, model route, retrieval count, fallback/cache status, tokens, estimated cost, latency, safety decision, schema result and assessment completion.

## Cost controls
Daily limits; cheap classifier/router where appropriate; verified common-answer cache; evidence cache with provenance; token ceilings; timeouts/fallbacks; per-family budgets; provider circuit breakers; alert on cost per completed learning loop.

## Dashboards
Product: active families, questions, completed loops, stars, reviews, parent engagement.
Quality: grounded-answer rate, schema failures, fallbacks, assessment completion, safety review outcomes.
Reliability: rates, p95/p99, errors, queues, DB saturation, provider health.
Economics: cost/run, cost/completed loop, cost/family, model mix, cache savings, margin estimate.
