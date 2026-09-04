begin;

create index if not exists idx_parent_accounts_family on parent_accounts(family_id);
create index if not exists idx_children_family on children(family_id);
create index if not exists idx_consents_family_active on parental_consents(family_id, revoked_at);
create index if not exists idx_tutor_runs_child_created on tutor_runs(child_id, created_at desc);
create index if not exists idx_tutor_runs_family_created on tutor_runs(family_id, created_at desc);
create index if not exists idx_evidence_tutor_run on evidence_refs(tutor_run_id);
create index if not exists idx_safety_family_created on safety_events(family_id, created_at desc);
create index if not exists idx_audit_resource on audit_events(resource_type, resource_id, created_at desc);

-- Application roles should not be superusers. Tenant authorization remains enforced
-- in the service layer; direct client access to these tables is not supported.

commit;
