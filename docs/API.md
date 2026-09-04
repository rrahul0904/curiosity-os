# API Contract

Prototype:
- `GET /healthz`
- `GET /api/bootstrap`
- `POST /api/tutor` body `{"question":"How do volcanoes work?"}`
- `POST /api/quiz` body `{"quizId":"quiz_x","selectedIndex":1}`
- `POST /api/review` body `{"starId":"star_x"}`
- `POST /api/rewards` body `{"title":"Science museum","cost":300}`

Production rules:
- version under `/v1`
- authenticate all protected requests
- parent/child/admin scopes enforced server-side
- idempotency keys for economic/repeatable mutations
- never trust client family/child IDs without authorization
- stable machine-readable errors and trace IDs
- model-provider payloads stay internal
