# Security, Safety and Privacy

## Safety pipeline
```text
Question → rate/length/device checks → PII detection/redaction
         → input moderation → policy engine
         → evidence+tutor → schema validation
         → output moderation → age check → response
```

The prototype regex layer is a development guard, not production-grade child safety.

## Identity
Parent uses adult authentication. Child uses constrained child session/handle/PIN. Child never receives parent credentials. Authorization is based on server-side family relationships. Admin access is least-privilege and auditable.

## Privacy
Minimize data; no behavioral ads/sale of child data; no raw voice storage by default; no sensitive question text in ordinary logs; encrypt in transit/at rest; parent export/deletion; version consent; retention by data class.

## Release gates
High-risk prompt corpus, PII leakage, prompt injection, moderation regressions, tenant isolation, consent enforcement, deletion/export, abuse/rate limits, operational-access audit.
