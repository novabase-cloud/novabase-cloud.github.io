import { STORAGE_KEYS, API_BASE_URL } from './config.js';
import { fetchJSON } from './utils/http.js';
import { handleCallback, revokeToken } from './utils/oauth.js';

const FORCE_CONSENT_KEY = 'huggingface_oauth_force_consent';

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
      cachedToken = token.trim();
      return cachedToken;
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

export function getUserInfo() {
  try {
    const info = localStorage.getItem(USER_KEY);
    return info ? JSON.parse(info) : null;
  } catch (_) {
    return null;
  }
}

export async function validateToken() {
  const token = getToken();
  if (!token) return false;
  
  const url = `${API_BASE_URL}/api/whoami-v2`;
  try {
    // http.js will automatically attach the Bearer token
    const result = await fetchJSON(url);
    if (result.ok && result.data) {
      localStorage.setItem(USER_KEY, JSON.stringify(result.data));
      return result.data;
    }
    return false;
  } catch (err) {
    console.warn('[auth] Token validation failed', err);
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
    console.error('[auth] loginWithCode error', err);
    return false;
  }
}

export function logout() {
  const token = cachedToken || getToken();
  cachedToken = null;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  for (const key of OAUTH_KEYS) {
    localStorage.removeItem(key);
  }

  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
  }

  localStorage.setItem(FORCE_CONSENT_KEY, '1');
  
  if (token) {
    revokeToken(token);
  }
}

export function buildKeyedUrl(path, params = {}) {
  const url = new URL(path || '/', API_BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  
  // Inject token into URL as a fallback for the Authorization header
  const token = getToken();
  if (token && !url.searchParams.has('token')) {
    url.searchParams.set('token', token);
  }
  
  return url.toString();
}
