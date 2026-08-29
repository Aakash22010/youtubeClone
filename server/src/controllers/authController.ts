import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { AuthRequest } from '../middleware/auth';
import { loadUser } from '../db/users';
import { one } from '../utils/db';
import { signToken } from '../utils/jwt';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

/** A real bcrypt hash of a value nobody can supply, used to keep login timing flat. */
const ABSENT_USER_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.CmQVhk9Dj0Q1KgxbwvVgOaOmMOG9ZKq';

let googleClient: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  if (!googleClient) googleClient = new OAuth2Client(clientId);
  return googleClient;
}

/** The response both sign-in paths return: a token plus the user it belongs to. */
async function session(res: Response, userId: string, status = 200) {
  const user = await loadUser(userId);
  return res.status(status).json({ token: signToken(userId), user });
}

// @desc  Sign in (or sign up) with a Google ID token
// @route POST /api/auth/google   Body: { credential }
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ error: 'Google token missing subject or email' });
    }
    // An unverified Google email must not be able to claim an existing account.
    if (!payload.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified' });
    }

    const { sub, email, name, picture } = payload;

    // Insert, or adopt the row that already holds this email — a user who signed
    // up with a password and later clicks "Sign in with Google" is the same person,
    // and Google has just vouched for the address.
    const row = await one<{ id: string }>(
      `insert into users (email, google_sub, display_name, photo_url)
            values ($1, $2, $3, $4)
       on conflict (email) do update
              set google_sub   = coalesce(users.google_sub, excluded.google_sub),
                  photo_url    = case when users.photo_url  = '' then excluded.photo_url  else users.photo_url  end,
                  display_name = case when users.display_name = 'User' then excluded.display_name else users.display_name end
         returning id`,
      [email.toLowerCase(), sub, name || 'User', picture || ''],
    );

    return session(res, row!.id);
  } catch (error) {
    console.error('Google auth failed:', error);
    return res.status(401).json({ error: 'Google sign-in failed' });
  }
};

// @desc  Create an account with email and password
// @route POST /api/auth/signup   Body: { email, password, displayName? }
export const signup = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const row = await one<{ id: string }>(
      `insert into users (email, password_hash, display_name)
            values ($1, $2, $3)
       on conflict (email) do nothing
         returning id`,
      [email, passwordHash, displayName || email.split('@')[0]],
    );

    if (!row) return res.status(409).json({ error: 'An account with that email already exists' });
    return session(res, row.id, 201);
  } catch (error) {
    console.error('Signup failed:', error);
    return res.status(500).json({ error: 'Could not create account' });
  }
};

// @desc  Sign in with email and password
// @route POST /api/auth/login   Body: { email, password }
export const login = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const row = await one<{ id: string; password_hash: string | null }>(
      'select id, password_hash from users where email = $1',
      [email],
    );

    // One message and one code for "no such user" and "wrong password", so the
    // endpoint cannot be used to find out which emails have accounts. The compare
    // runs against a throwaway hash when there is no user, so the reply does not
    // come back measurably faster for an address that has never signed up either.
    const ok = await bcrypt.compare(password, row?.password_hash || ABSENT_USER_HASH);
    if (!ok || !row?.password_hash) return res.status(401).json({ error: 'Invalid email or password' });

    return session(res, row!.id);
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Could not sign in' });
  }
};

// @desc  The signed-in user
// @route GET /api/auth/me
export const me = async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
};
