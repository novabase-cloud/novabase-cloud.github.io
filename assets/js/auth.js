import { STORAGE_KEYS, API_BASE_URL } from './config.js';
import { fetchJSON } from './utils/http.js';
import { handleCallback } from './utils/oauth.js';

const TOKEN_KEY = STORAGE_KEYS.HF_TOKEN;
const USER_KEY = STORAGE_KEYS.USER_INFO;

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
  // Backward compatibility for components still calling getPassword()
  return getToken();
}

export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Validates the current token with Hugging Face (via Worker)
 */
export async function validateToken() {
  const token = getToken();
  if (!token) return false;

  // We use the /whoami endpoint of Hugging Face
  const url = `${API_BASE_URL}/api/whoami-v2`;
  try {
    const result = await fetchJSON(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return result.ok && !!result.data?.name;
  } catch (_) {
    return false;
  }
}

/**
 * Processes the OAuth code from the URL and performs login
 */
export async function loginWithCode(code) {
  try {
    const data = await handleCallback(code);
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      cachedToken = data.access_token;
      
      // Optionally fetch and store user info
      // await fetchUserInfo();
      
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function buildKeyedUrl(path, params = {}) {
  const token = getToken();
  const url = new URL(path || '/', API_BASE_URL);
  
  // Note: We prefer Authorization header, but some legacy logic might need query param
  // if (token) {
  //   url.searchParams.set('token', token);
  // }
  
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}
