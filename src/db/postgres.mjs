export class PostgresPlatformStore {
  constructor(pool) { this.pool = pool; this.kind = 'postgres'; }

  static async connect(connectionString) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 10),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000),
      application_name: 'curiosity-os'
    });
    await pool.query('select 1');
    return new PostgresPlatformStore(pool);
  }

  async registerParent({ email, passwordHash }) {
    const client=await this.pool.connect();
    try {
      await client.query('begin');
      const family=(await client.query(`insert into families(status) values ('active') returning id,status,created_at`)).rows[0];
      const parent=(await client.query(`insert into parent_accounts(family_id,email,password_hash) values ($1,$2,$3) returning id,family_id,email,created_at`,[family.id,email,passwordHash])).rows[0];
      await client.query(`insert into audit_events(actor_type,actor_id,action,resource_type,resource_id) values ('parent',$1,'parent.registered','family',$2)`,[parent.id,family.id]);
      await client.query('commit');
      return { family:{id:family.id,status:family.status,createdAt:family.created_at}, parent:{id:parent.id,familyId:parent.family_id,email:parent.email,passwordHash,createdAt:parent.created_at} };
    } catch(error) {
      await client.query('rollback');
      if (error.code === '23505') { error.statusCode=409; error.message='email already registered'; }
      throw error;
    } finally { client.release(); }
  }

  async getParentByEmail(email) {
    const row=(await this.pool.query(`select id,family_id,email,password_hash,created_at from parent_accounts where email=$1 and deleted_at is null`,[email])).rows[0];
    return row ? {id:row.id,familyId:row.family_id,email:row.email,passwordHash:row.password_hash,createdAt:row.created_at} : null;
  }

  async hasActiveConsent(familyId) {
    const row=(await this.pool.query(`select 1 from parental_consents where family_id=$1 and revoked_at is null limit 1`,[familyId])).rows[0];
    return Boolean(row);
  }

  async grantConsent({ familyId, parentId, policyVersion, consentType='child-ai-learning' }) {
    const row=(await this.pool.query(`
      insert into parental_consents(family_id,parent_id,policy_version,consent_type)
      values($1,$2,$3,$4)
      on conflict (family_id,consent_type) where revoked_at is null
      do update set policy_version=excluded.policy_version, granted_at=now()
      returning id,family_id,parent_id,policy_version,consent_type,granted_at,revoked_at
    `,[familyId,parentId,policyVersion,consentType])).rows[0];
    return {id:row.id,familyId:row.family_id,parentId:row.parent_id,policyVersion:row.policy_version,consentType:row.consent_type,grantedAt:row.granted_at,revokedAt:row.revoked_at};
  }

  async createChild({ familyId, displayName, gradeLevel, handle, pinHash }) {
    const row=(await this.pool.query(`
      insert into children(family_id,display_name,grade_level,handle,pin_hash)
      values($1,$2,$3,$4,$5)
      returning id,family_id,display_name,grade_level,handle,pin_hash,status,created_at
    `,[familyId,displayName,gradeLevel,handle,pinHash])).rows[0];
    return {id:row.id,familyId:row.family_id,displayName:row.display_name,gradeLevel:row.grade_level,handle:row.handle,pinHash:row.pin_hash,status:row.status,createdAt:row.created_at};
  }

  async getChildByHandle(handle) {
    const row=(await this.pool.query(`select id,family_id,display_name,grade_level,handle,pin_hash,status,created_at from children where handle=$1 and status='active'`,[handle])).rows[0];
    return row ? {id:row.id,familyId:row.family_id,displayName:row.display_name,gradeLevel:row.grade_level,handle:row.handle,pinHash:row.pin_hash,status:row.status,createdAt:row.created_at} : null;
  }

  async getChild(childId) {
    const row=(await this.pool.query(`select id,family_id,display_name,grade_level,handle,status,created_at from children where id=$1 and status='active'`,[childId])).rows[0];
    return row ? {id:row.id,familyId:row.family_id,displayName:row.display_name,gradeLevel:row.grade_level,handle:row.handle,status:row.status,createdAt:row.created_at} : null;
  }

  async recordSafetyEvent(event) {
    const row=(await this.pool.query(`
      insert into safety_events(child_id,family_id,category,policy_version,action,parent_visible)
      values($1,$2,$3,$4,$5,$6)
      returning id,created_at
    `,[event.childId,event.familyId,event.category,event.policyVersion,event.action,event.parentVisible!==false])).rows[0];
    return {id:row.id,...event,createdAt:row.created_at};
  }

  async recordTutorRun(run) {
    const client=await this.pool.connect();
    try {
      await client.query('begin');
      const row=(await client.query(`
        insert into tutor_runs(child_id,family_id,question_text,prompt_version,model_route,status,latency_ms,input_tokens,output_tokens,cost_micros)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        returning id,created_at
      `,[run.childId,run.familyId,run.question,run.promptVersion,run.modelRoute,run.status,run.latencyMs,run.inputTokens,run.outputTokens,run.costMicros])).rows[0];
      for (const ref of run.evidence ?? []) {
        await client.query(`insert into evidence_refs(tutor_run_id,source_uri,source_title,publisher,source_quality,snippet) values($1,$2,$3,$4,$5,$6)`,
          [row.id,ref.url,ref.title,ref.publisher,ref.quality,ref.snippet]);
      }
      await client.query('commit');
      return {id:row.id,...run,createdAt:row.created_at};
    } catch(error){ await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
}
