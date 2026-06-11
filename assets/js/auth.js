import { STORAGE_KEYS, API_BASE_URL } from './config.js';
import { fetchJSON } from './utils/http.js';
import { handleCallback } from './utils/oauth.js';

const TOKEN_KEY = STORAGE_KEYS.HF_TOKEN;
const USER_KEY = STORAGE_KEYS.USER_INFO;

const OAUTH_KEYS = [
  'huggingface_oauth_verifier',
  'huggingface_oauth_state',
];

const SESSION_KEYS = [
  STORAGE_KEYS.PATH_HISTORY,
  STORAGE_KEYS.SIDEBAR_OPEN,
  STORAGE_KEYS.PREV_REPO,
];

let cachedToken = null;

export function getToken() {
  if (cachedToken) return cachedToken;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      cachedToken = token;
      return token;
    }
  } catch (_) {}
  return null;
}

export function getPassword() {
  return getToken();
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export async function validateToken() {
  const token = getToken();
  if (!token) return false;
  const url = `${API_BASE_URL}/api/whoami-v2`;
  try {
    const result = await fetchJSON(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return result.ok && !!result.data?.name;
  } catch (_) {
    return false;
  }
}

export async function loginWithCode(code) {
  try {
    const data = await handleCallback(code);
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      cachedToken = data.access_token;
      return true;
    }
    return false;
  } catch (err) {
    console.error('[auth.js] loginWithCode error', err);
    return false;
  }
}

export function logout() {
  cachedToken = null;

  // Clear HF token + user info
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Clear OAuth PKCE temp data (in case of interrupted flow)
  for (const key of OAUTH_KEYS) {
    localStorage.removeItem(key);
  }

  // Clear session data: history, sidebar, last repo
  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
  }
}

export function buildKeyedUrl(path, params = {}) {
  const url = new URL(path || '/', API_BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}
