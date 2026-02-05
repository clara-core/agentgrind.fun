import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI || 'https://agentgrind.fun/api/x/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: 'missing_X_client_credentials' }, { status: 500 });
  }

  const cookieState = (req.headers.get('cookie') || '').match(/(?:^|; )ag_x_state=([^;]+)/)?.[1];
  const cookieVerifier = (req.headers.get('cookie') || '').match(/(?:^|; )ag_x_verifier=([^;]+)/)?.[1];
  const cookieNext = (req.headers.get('cookie') || '').match(/(?:^|; )ag_x_next=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || !cookieVerifier || state !== decodeURIComponent(cookieState)) {
    return NextResponse.json({ ok: false, error: 'invalid_state' }, { status: 400 });
  }

  // exchange code for token
  const tokenUrl = 'https://api.x.com/2/oauth2/token';
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', redirectUri);
  body.set('code_verifier', decodeURIComponent(cookieVerifier));

  const tokenResp = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!tokenResp.ok) {
    const t = await tokenResp.text();
    return NextResponse.json({ ok: false, error: 'token_exchange_failed', detail: t }, { status: 400 });
  }

  const tokenJson: any = await tokenResp.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 400 });
  }

  // fetch username
  const meResp = await fetch('https://api.x.com/2/users/me?user.fields=username', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!meResp.ok) {
    const t = await meResp.text();
    return NextResponse.json({ ok: false, error: 'users_me_failed', detail: t }, { status: 400 });
  }

  const me: any = await meResp.json();
  const username = me?.data?.username;
  if (!username) {
    return NextResponse.json({ ok: false, error: 'missing_username' }, { status: 400 });
  }

  const next = cookieNext ? decodeURIComponent(cookieNext) : '/profile';
  const to = new URL(next, 'https://agentgrind.fun');
  to.searchParams.set('x_handle', `@${username}`);

  const res = NextResponse.redirect(to.toString());
  // clear cookies
  res.cookies.set('ag_x_state', '', { path: '/', maxAge: 0 });
  res.cookies.set('ag_x_verifier', '', { path: '/', maxAge: 0 });
  res.cookies.set('ag_x_next', '', { path: '/', maxAge: 0 });
  return res;
}
