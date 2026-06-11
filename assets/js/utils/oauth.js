/**
 * OAuth 2.0 PKCE Utilities for Hugging Face
 */

export const OAUTH_CONFIG = {
  CLIENT_ID: '6b7e058a-f8f5-4b92-810a-9497864baa26',
  REDIRECT_URI: 'https://novabase-cloud.github.io/#/login',
  SCOPE: 'read-repos openid profile',
  AUTH_URL: 'https://huggingface.co/oauth/authorize',
  TOKEN_URL: 'https://huggingface.co/oauth/token',
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

  // Store code_verifier for later use in the callback
  localStorage.setItem('huggingface_oauth_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CONFIG.CLIENT_ID,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
    scope: OAUTH_CONFIG.SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: generateRandomString(16),
  });

  window.location.href = `${OAUTH_CONFIG.AUTH_URL}?${params.toString()}`;
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
