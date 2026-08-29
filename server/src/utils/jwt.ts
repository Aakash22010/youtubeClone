import jwt from 'jsonwebtoken';

const EXPIRES_IN = '30d';

/**
 * Read at call time, not at import time, so a missing secret surfaces as a
 * failed request instead of a crash on boot — and so it can never silently
 * fall back to a default, which would let anyone mint a valid token.
 */
function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  return s;
}

export const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, secret(), { expiresIn: EXPIRES_IN });

/** Returns the user id, or throws if the token is missing, expired or forged. */
export function verifyToken(token: string): string {
  const payload = jwt.verify(token, secret());
  const sub = typeof payload === 'string' ? null : payload.sub;
  if (!sub || typeof sub !== 'string') throw new Error('Token has no subject');
  return sub;
}
