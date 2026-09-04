# Data Model

Core entities:
Family → ParentAccount, ParentalConsent, Child.
Child → ChildSession, Question, SafetyDecision, TutorRun, AssessmentAttempt, Star, MasteryEvent, ReviewSchedule, StardustLedger.
TutorRun → EvidenceReference.
Star → Concept; Concept → ConceptEdge.
Family → RewardGoal.
Platform → PolicyVersion, PromptVersion, AuditEvent.

## Proposed PostgreSQL tables
families, parent_accounts, parental_consents, children, child_sessions, questions, tutor_runs, evidence_refs, concepts, concept_edges, stars, mastery_events, assessment_attempts, review_schedule, stardust_ledger, reward_goals, safety_events, policy_versions, prompt_versions, audit_events.

## Rules
- Stardust is append-only.
- Mastery should be reconstructable from mastery events.
- Consent/policy records are immutable/versioned.
- Raw voice is not persisted by default.
- Parent PII and child learning data use separate access paths.
