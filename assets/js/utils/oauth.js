/**
 * OAuth 2.0 PKCE Utilities for Hugging Face
 */

const FORCE_CONSENT_KEY = 'huggingface_oauth_force_consent';

const getRedirectUri = () => {
  // Use current origin and pathname to construct the redirect URI dynamically,
  // but ensure it ends with /#/login as registered in the HF app settings.
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/+$/, '');
  return `${origin}${path}/#/login`;
};

export const OAUTH_CONFIG = {
  CLIENT_ID: '6b7e058a-f8f5-4b92-810a-9497864baa26',
  REDIRECT_URI: getRedirectUri(),
  SCOPE: 'read-repos openid profile read-collections',
  AUTH_URL: 'https://huggingface.co/oauth/authorize',
  TOKEN_URL: 'https://huggingface.co/oauth/token',
  REVOKE_URL: 'https://huggingface.co/oauth/revoke',
};

/**
 * Generates a random string for the code verifier
 */
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map((x) => possible[x % possible.length]).join('');
}

/**
 * SHA-256 hashing for the code challenge
 */
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

/**
 * Base64url encoding
 */
function base64urlencode(a) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates the PKCE OAuth Flow
 */
export async function initiateLogin() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlencode(hashed);

  // Store code_verifier and state for later use in the callback
  const state = generateRandomString(16);
  localStorage.setItem('huggingface_oauth_verifier', codeVerifier);
  localStorage.setItem('huggingface_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CONFIG.CLIENT_ID,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
    scope: OAUTH_CONFIG.SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  // Force HF to ask for consent if user explicitly logged out
  if (localStorage.getItem(FORCE_CONSENT_KEY)) {
    params.set('prompt', 'consent');
    localStorage.removeItem(FORCE_CONSENT_KEY);
  }

  window.location.href = `${OAUTH_CONFIG.AUTH_URL}?${params.toString()}`;
}

/**
 * Revokes the current HF token so next login requires re-authorization
 */
export async function revokeToken(token) {
  if (!token) return;
  try {
    await fetch(OAUTH_CONFIG.REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: OAUTH_CONFIG.CLIENT_ID }),
    });
  } catch (_) {
    // Revocation is best-effort (network may fail)
  }
}

/**
 * Handles the OAuth callback and exchanges the code for a token
 */
export async function handleCallback(code) {
  const codeVerifier = localStorage.getItem('huggingface_oauth_verifier');
  if (!codeVerifier) {
    throw new Error('Missing code_verifier. Login session expired or invalid.');
  }

  const payload = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: OAUTH_CONFIG.CLIENT_ID,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const response = await fetch(OAUTH_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload,
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  // Cleanup
  localStorage.removeItem('huggingface_oauth_verifier');
  
  return data; // contains access_token, refresh_token, etc.
}
