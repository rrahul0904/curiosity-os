import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export async function hashSecret(secret, salt = randomBytes(16).toString('hex')) {
  const value = String(secret ?? '');
  if (value.length < 4) throw new Error('secret too short');
  const derived = await scrypt(value, salt, 32);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifySecret(secret, encoded) {
  const [scheme, salt, expectedHex] = String(encoded ?? '').split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(String(secret ?? ''), salt, 32));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function b64(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function issueSessionToken(claims, secret, ttlSeconds = 12 * 60 * 60) {
  if (!secret || String(secret).length < 16) throw new Error('SESSION_SECRET must be at least 16 characters');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
    jti: randomBytes(12).toString('hex')
  };
  const encoded = b64(JSON.stringify(payload));
  return `v1.${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const [version, encoded, signature] = String(token ?? '').split('.');
  if (version !== 'v1' || !encoded || !signature) throw new Error('invalid session token');
  const expected = sign(encoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('invalid session signature');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.sub || !payload.role || !payload.exp || payload.exp <= nowSeconds) throw new Error('session expired or invalid');
  return payload;
}

export function bearerToken(req) {
  const raw = String(req.headers.authorization ?? '');
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : null;
}
