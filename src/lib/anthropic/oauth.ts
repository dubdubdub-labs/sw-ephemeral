import { ANTHROPIC_OAUTH, ANTHROPIC_API } from './constants';
import type { TokenResponse, Credentials, AuthURLResult, AnthropicHeaders } from './types';

/**
 * Generate random string for PKCE flow
 */
function generateRandomString(length = 32): string {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Server-side fallback
    const crypto = require('crypto');
    crypto.randomFillSync(array);
  }
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate SHA-256 hash for PKCE challenge
 */
async function sha256(plain: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    // Node.js environment
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(plain)
      .digest('base64url');
  }
}

/**
 * Generate OAuth sign-in URL with PKCE
 */
export async function generateSignInURL(): Promise<AuthURLResult> {
  const verifier = generateRandomString();
  const challenge = await sha256(verifier);

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
 * Exchange authorization code for OAuth tokens
 */
export async function exchangeOAuthToken(
  codeWithState: string,
  verifier: string
): Promise<Credentials> {
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

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.account.email_address,
    scope: data.scope,
  };
}

/**
 * Refresh an existing OAuth token
 */
export async function refreshAuthToken(refreshToken: string): Promise<Credentials> {
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

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.account.email_address,
    scope: data.scope,
  };
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(expiresAt: Date | number): boolean {
  const expiryTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  return Date.now() >= expiryTime;
}

/**
 * Check if a token is expiring within the next hour
 */
export function isTokenExpiringSoon(expiresAt: Date | number): boolean {
  const expiryTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  const now = Date.now();
  return expiryTime - now < ANTHROPIC_OAUTH.TOKEN_WARNING_MS && expiryTime > now;
}

/**
 * Generate Anthropic API headers for authenticated requests
 */
export function getAnthropicHeaders(accessToken: string): AnthropicHeaders {
  return {
    'User-Agent': ANTHROPIC_API.USER_AGENT,
    'Authorization': `Bearer ${accessToken}`,
    'anthropic-beta': ANTHROPIC_API.BETA_HEADER,
  };
}