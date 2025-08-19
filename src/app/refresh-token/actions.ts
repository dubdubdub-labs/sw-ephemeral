'use server';

import crypto from 'crypto';
import { ANTHROPIC_OAUTH } from '@/lib/anthropic/constants';
import type { TokenResponse, Credentials } from '@/lib/anthropic/types';

/**
 * Generate OAuth sign-in URL with PKCE (server-side)
 */
export async function generateAuthURL() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  const params = new URLSearchParams({
    client_id: ANTHROPIC_OAUTH.CLIENT_ID,
    redirect_uri: ANTHROPIC_OAUTH.REDIRECT_URI,
    response_type: 'code',
    code: 'true',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: ANTHROPIC_OAUTH.SCOPES.join(' '),
    state: verifier,
  });

  return {
    authURL: `${ANTHROPIC_OAUTH.AUTH_ENDPOINT}?${params}`,
    verifier,
  };
}

/**
 * Exchange authorization code for OAuth tokens (server-side)
 */
export async function exchangeToken(codeWithState: string, verifier: string) {
  // Parse the code#state format
  const [code, state] = codeWithState.split('#');
  
  if (!code || state !== verifier) {
    throw new Error('Invalid authorization code or state mismatch');
  }

  const body = {
    code,
    state,
    grant_type: 'authorization_code',
    client_id: ANTHROPIC_OAUTH.CLIENT_ID,
    redirect_uri: ANTHROPIC_OAUTH.REDIRECT_URI,
    code_verifier: verifier,
  };

  const response = await fetch(ANTHROPIC_OAUTH.TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as TokenResponse;

  // Use our fixed expiration time (7 hours 50 minutes)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + ANTHROPIC_OAUTH.TOKEN_LIFETIME_MS,
    email: data.account.email_address,
    scope: data.scope,
  } as Credentials;
}

/**
 * Refresh an existing OAuth token (server-side)
 */
export async function refreshToken(refreshToken: string) {
  const body = {
    grant_type: 'refresh_token',
    client_id: ANTHROPIC_OAUTH.CLIENT_ID,
    refresh_token: refreshToken,
  };

  const response = await fetch(ANTHROPIC_OAUTH.TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as TokenResponse;

  // Use our fixed expiration time (7 hours 50 minutes)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + ANTHROPIC_OAUTH.TOKEN_LIFETIME_MS,
    email: data.account.email_address,
    scope: data.scope,
  } as Credentials;
}