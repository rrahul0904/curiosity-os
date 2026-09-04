export function requireRole(session, role) {
  if (!session || session.role !== role) {
    const error = new Error('forbidden');
    error.statusCode = 403;
    throw error;
  }
  return session;
}

export function requireFamily(session, familyId) {
  if (!session || !session.familyId || session.familyId !== familyId) {
    const error = new Error('family access denied');
    error.statusCode = 403;
    throw error;
  }
  return session;
}

export function requireChild(session, childId) {
  requireRole(session, 'child');
  if (session.childId !== childId) {
    const error = new Error('child access denied');
    error.statusCode = 403;
    throw error;
  }
  return session;
}
