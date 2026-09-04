import { randomBytes } from 'node:crypto';
import { normalizeEmail, hashSecret, verifySecret, issueSessionToken, verifySessionToken, bearerToken } from './auth.mjs';
import { requireRole, requireFamily } from './authorization.mjs';
import { runGroundedTutor } from './tutor-orchestrator.mjs';

function publicParent(parent) {
  return { id: parent.id, familyId: parent.familyId, email: parent.email, createdAt: parent.createdAt };
}

function publicChild(child) {
  return {
    id: child.id,
    familyId: child.familyId,
    displayName: child.displayName,
    gradeLevel: child.gradeLevel,
    handle: child.handle,
    status: child.status,
    createdAt: child.createdAt
  };
}

function makeHandle(name) {
  const slug = String(name || 'learner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'learner';
  return `${slug}-${randomBytes(3).toString('hex')}`;
}

export function createV1Handler({ platform, sessionSecret, send, bodyJson }) {
  function sessionFromRequest(req) {
    const token = bearerToken(req);
    if (!token) {
      const error = new Error('authentication required');
      error.statusCode = 401;
      throw error;
    }
    try {
      return verifySessionToken(token, sessionSecret);
    } catch {
      const error = new Error('invalid or expired session');
      error.statusCode = 401;
      throw error;
    }
  }

  async function registerParent(req, res) {
    const { email, password } = await bodyJson(req);
    const normalized = normalizeEmail(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return send(res, 400, { error: 'valid email required' });
    if (String(password ?? '').length < 12) return send(res, 400, { error: 'password must be at least 12 characters' });
    const passwordHash = await hashSecret(password);
    const { family, parent } = await platform.registerParent({ email: normalized, passwordHash });
    const token = issueSessionToken({ sub: parent.id, role: 'parent', familyId: family.id }, sessionSecret);
    return send(res, 201, { token, parent: publicParent(parent), family: { id: family.id, status: family.status }, persistence: platform.kind });
  }

  async function loginParent(req, res) {
    const { email, password } = await bodyJson(req);
    const parent = await platform.getParentByEmail(normalizeEmail(email));
    if (!parent || !await verifySecret(password, parent.passwordHash)) return send(res, 401, { error: 'invalid credentials' });
    const token = issueSessionToken({ sub: parent.id, role: 'parent', familyId: parent.familyId }, sessionSecret);
    return send(res, 200, { token, parent: publicParent(parent) });
  }

  async function grantConsent(req, res) {
    const session = requireRole(sessionFromRequest(req), 'parent');
    const body = await bodyJson(req);
    const consent = await platform.grantConsent({
      familyId: session.familyId,
      parentId: session.sub,
      policyVersion: String(body.policyVersion || 'consent-2026-09-v1').slice(0, 80)
    });
    return send(res, 201, { consent });
  }

  async function createChild(req, res) {
    const session = requireRole(sessionFromRequest(req), 'parent');
    if (!await platform.hasActiveConsent(session.familyId)) return send(res, 409, { error: 'active parental consent required' });
    const { displayName, gradeLevel, pin } = await bodyJson(req);
    const name = String(displayName ?? '').trim();
    const grade = Number(gradeLevel);
    if (!name || name.length > 80 || !Number.isInteger(grade) || grade < 0 || grade > 12) return send(res, 400, { error: 'valid displayName and gradeLevel 0-12 required' });
    if (!/^\d{4,8}$/.test(String(pin ?? ''))) return send(res, 400, { error: 'PIN must be 4-8 digits' });
    const pinHash = await hashSecret(String(pin));
    let child = null;
    for (let attempt = 0; attempt < 3 && !child; attempt += 1) {
      try {
        child = await platform.createChild({ familyId: session.familyId, displayName: name, gradeLevel: grade, handle: makeHandle(name), pinHash });
      } catch (error) {
        if (error.statusCode !== 409) throw error;
      }
    }
    if (!child) {
      const error = new Error('could not allocate child handle');
      error.statusCode = 503;
      throw error;
    }
    return send(res, 201, { child: publicChild(child) });
  }

  async function loginChild(req, res) {
    const { handle, pin } = await bodyJson(req);
    const child = await platform.getChildByHandle(String(handle ?? '').trim().toLowerCase());
    if (!child || !await verifySecret(String(pin ?? ''), child.pinHash)) return send(res, 401, { error: 'invalid child credentials' });
    if (!await platform.hasActiveConsent(child.familyId)) return send(res, 403, { error: 'parental consent is not active' });
    const token = issueSessionToken({ sub: child.id, role: 'child', familyId: child.familyId, childId: child.id }, sessionSecret, 8 * 60 * 60);
    return send(res, 200, { token, child: publicChild(child) });
  }

  async function me(req, res) {
    const session = sessionFromRequest(req);
    if (session.role === 'child') {
      const child = await platform.getChild(session.childId);
      if (!child) return send(res, 404, { error: 'child not found' });
      requireFamily(session, child.familyId);
      return send(res, 200, { session, child: publicChild(child) });
    }
    return send(res, 200, { session });
  }

  async function groundedTutor(req, res) {
    const session = requireRole(sessionFromRequest(req), 'child');
    const child = await platform.getChild(session.childId);
    if (!child) return send(res, 404, { error: 'child not found' });
    requireFamily(session, child.familyId);
    if (!await platform.hasActiveConsent(child.familyId)) return send(res, 403, { error: 'parental consent is not active' });
    const { question } = await bodyJson(req);
    const result = await runGroundedTutor({ question, child, platform });
    return send(res, 200, result);
  }

  return async function handleV1(req, res, url) {
    if (!url.pathname.startsWith('/v1/')) return false;
    if (req.method === 'POST' && url.pathname === '/v1/parents/register') await registerParent(req, res);
    else if (req.method === 'POST' && url.pathname === '/v1/parents/login') await loginParent(req, res);
    else if (req.method === 'POST' && url.pathname === '/v1/consents') await grantConsent(req, res);
    else if (req.method === 'POST' && url.pathname === '/v1/children') await createChild(req, res);
    else if (req.method === 'POST' && url.pathname === '/v1/children/login') await loginChild(req, res);
    else if (req.method === 'GET' && url.pathname === '/v1/me') await me(req, res);
    else if (req.method === 'POST' && url.pathname === '/v1/tutor') await groundedTutor(req, res);
    else send(res, 404, { error: 'not found' });
    return true;
  };
}
