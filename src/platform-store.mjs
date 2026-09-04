function ensureProd(state) {
  state.production ??= {};
  state.production.families ??= [];
  state.production.parents ??= [];
  state.production.consents ??= [];
  state.production.children ??= [];
  state.production.tutorRuns ??= [];
  state.production.safetyEvents ??= [];
  state.production.audit ??= [];
  return state.production;
}

export class JsonPlatformStore {
  constructor(jsonStore) {
    this.store = jsonStore;
    this.kind = 'json';
  }

  async registerParent({ email, passwordHash }) {
    return this.store.mutate((state) => {
      const p = ensureProd(state);
      if (p.parents.some((x) => x.email === email)) {
        const error = new Error('email already registered'); error.statusCode = 409; throw error;
      }
      const family = { id: this.store.id('fam'), createdAt: new Date().toISOString(), status: 'active' };
      const parent = { id: this.store.id('parent'), familyId: family.id, email, passwordHash, createdAt: family.createdAt };
      p.families.push(family); p.parents.push(parent);
      p.audit.push({ id: this.store.id('audit'), actorType:'parent', actorId:parent.id, action:'parent.registered', resourceType:'family', resourceId:family.id, createdAt:family.createdAt });
      return { family, parent };
    });
  }

  async getParentByEmail(email) {
    const state = await this.store.read();
    return ensureProd(state).parents.find((x) => x.email === email) ?? null;
  }

  async hasActiveConsent(familyId) {
    const state = await this.store.read();
    return ensureProd(state).consents.some((x) => x.familyId === familyId && !x.revokedAt);
  }

  async grantConsent({ familyId, parentId, policyVersion, consentType = 'child-ai-learning' }) {
    return this.store.mutate((state) => {
      const p = ensureProd(state);
      const parent = p.parents.find((x) => x.id === parentId && x.familyId === familyId);
      if (!parent) { const error=new Error('parent not found'); error.statusCode=404; throw error; }
      const existing = p.consents.find((x) => x.familyId===familyId && x.consentType===consentType && !x.revokedAt);
      if (existing) return existing;
      const consent = { id:this.store.id('consent'),familyId,parentId,policyVersion,consentType,grantedAt:new Date().toISOString(),revokedAt:null };
      p.consents.push(consent);
      p.audit.push({ id:this.store.id('audit'),actorType:'parent',actorId:parentId,action:'consent.granted',resourceType:'consent',resourceId:consent.id,createdAt:consent.grantedAt });
      return consent;
    });
  }

  async createChild({ familyId, displayName, gradeLevel, handle, pinHash }) {
    return this.store.mutate((state) => {
      const p=ensureProd(state);
      if(!p.families.some((x)=>x.id===familyId)) { const e=new Error('family not found');e.statusCode=404;throw e; }
      if(p.children.some((x)=>x.handle===handle)) { const e=new Error('handle collision');e.statusCode=409;throw e; }
      const child={id:this.store.id('child'),familyId,displayName,gradeLevel,handle,pinHash,status:'active',createdAt:new Date().toISOString()};
      p.children.push(child);
      p.audit.push({id:this.store.id('audit'),actorType:'parent',actorId:null,action:'child.created',resourceType:'child',resourceId:child.id,createdAt:child.createdAt});
      return child;
    });
  }

  async getChildByHandle(handle) {
    const state=await this.store.read();
    return ensureProd(state).children.find((x)=>x.handle===handle) ?? null;
  }

  async getChild(childId) {
    const state=await this.store.read();
    return ensureProd(state).children.find((x)=>x.id===childId) ?? null;
  }

  async recordSafetyEvent(event) {
    return this.store.mutate((state)=>{
      const p=ensureProd(state);
      const row={id:this.store.id('safe'),...event,createdAt:event.createdAt??new Date().toISOString()};
      p.safetyEvents.push(row); return row;
    });
  }

  async recordTutorRun(run) {
    return this.store.mutate((state)=>{
      const p=ensureProd(state);
      const row={id:this.store.id('run'),...run,createdAt:run.createdAt??new Date().toISOString()};
      p.tutorRuns.push(row); return row;
    });
  }
}

export async function createPlatformStore({ jsonStore }) {
  if (!process.env.DATABASE_URL) return new JsonPlatformStore(jsonStore);
  const { PostgresPlatformStore } = await import('./db/postgres.mjs');
  return PostgresPlatformStore.connect(process.env.DATABASE_URL);
}
