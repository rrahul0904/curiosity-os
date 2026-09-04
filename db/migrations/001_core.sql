begin;

create extension if not exists pgcrypto;

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now()
);

create table if not exists parent_accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (email)
);

create table if not exists parental_consents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  parent_id uuid not null references parent_accounts(id) on delete cascade,
  policy_version text not null,
  consent_type text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists uq_active_family_consent
  on parental_consents(family_id, consent_type) where revoked_at is null;

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  grade_level int not null check (grade_level between 0 and 12),
  handle text not null unique,
  pin_hash text not null,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now()
);

create table if not exists tutor_runs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  question_text text not null,
  prompt_version text not null,
  model_route text not null,
  status text not null,
  latency_ms int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_micros bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists evidence_refs (
  id uuid primary key default gen_random_uuid(),
  tutor_run_id uuid not null references tutor_runs(id) on delete cascade,
  source_uri text not null,
  source_title text not null,
  publisher text,
  source_quality numeric(4,3) not null default 0.5 check (source_quality between 0 and 1),
  snippet text,
  retrieved_at timestamptz not null default now()
);

create table if not exists safety_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  category text not null,
  policy_version text not null,
  action text not null,
  parent_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

commit;
