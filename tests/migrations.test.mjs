import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('core PostgreSQL migration contains identity, consent, evidence and audit tables', async () => {
  const sql=await readFile(new URL('../db/migrations/001_core.sql',import.meta.url),'utf8');
  for(const table of ['families','parent_accounts','parental_consents','children','tutor_runs','evidence_refs','safety_events','audit_events']) {
    assert.match(sql,new RegExp(`create table if not exists ${table}`));
  }
  assert.match(sql,/unique index if not exists uq_active_family_consent/);
});
