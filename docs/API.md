# API Contract

## Production `/v1`

- `POST /v1/parents/register` — create family + parent account; returns signed parent session.
- `POST /v1/parents/login` — verify parent credentials.
- `POST /v1/consents` — parent bearer token required; creates/version-updates active consent.
- `POST /v1/children` — parent token + active consent; creates child handle and hashed PIN.
- `POST /v1/children/login` — verifies child handle/PIN + active consent; returns child session.
- `GET /v1/me` — authenticated session context.
- `POST /v1/tutor` — child token + active consent; safety → evidence → grounded tutor orchestration.

## Legacy demo `/api`

- `GET /api/bootstrap`
- `POST /api/tutor`
- `POST /api/quiz`
- `POST /api/review`
- `POST /api/rewards`

These remain intentionally zero-config while `/v1` evolves into the production contract.

## Production rules

Authenticate protected requests, enforce parent/child/admin scopes and active parental consent server-side, never trust client family/child IDs without authorization, use parameterized SQL, keep provider payloads internal, add idempotency keys to future economic/repeatable mutations, and attach trace IDs in the observability phase.
