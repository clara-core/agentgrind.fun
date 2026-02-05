import { NextResponse } from 'next/server';
import crypto from 'crypto';

function base64url(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sha256(verifier: string) {
  return crypto.createHash('sha256').update(verifier).digest();
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI || 'https://agentgrind.fun/api/x/callback';
  if (!clientId) {
    return NextResponse.json({ ok: false, error: 'missing_X_CLIENT_ID' }, { status: 500 });
  }

  const state = base64url(crypto.randomBytes(24));
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(await sha256(codeVerifier));

  const scope = (process.env.X_SCOPE || 'users.read tweet.read offline.access').trim();

  const auth = new URL('https://twitter.com/i/oauth2/authorize');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('scope', scope);
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', codeChallenge);
  auth.searchParams.set('code_challenge_method', 'S256');

  // after success, bounce back to /profile
  const next = url.searchParams.get('next') || '/profile';

  const res = NextResponse.redirect(auth.toString());
  // short-lived cookies for callback validation
  res.cookies.set('ag_x_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  res.cookies.set('ag_x_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  res.cookies.set('ag_x_next', next, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return res;
}
