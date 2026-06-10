import { STORAGE_KEYS, API_BASE_URL } from './config.js';
import { fetchJSON } from './utils/http.js';

const PASSWORD_KEY = STORAGE_KEYS.PASSWORD;
const REMEMBER_KEY = `${STORAGE_KEYS.PASSWORD}.remember`;
const SESSION_FLAG = `${STORAGE_KEYS.PASSWORD}.session`;

let cachedPassword = null;

function clearAllStorage() {
  cachedPassword = null;
  try {
    sessionStorage.removeItem(SESSION_FLAG);
  } catch (_) {}
  try {
    localStorage.removeItem(PASSWORD_KEY);
  } catch (_) {}
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch (_) {}
}

export function getPassword() {
  if (cachedPassword) return cachedPassword;
  try {
    const session = sessionStorage.getItem(SESSION_FLAG);
    if (session) {
      cachedPassword = session;
      return session;
    }
  } catch (_) {}
  try {
    const persistent = localStorage.getItem(PASSWORD_KEY);
    if (persistent) {
      cachedPassword = persistent;
      return persistent;
    }
  } catch (_) {}
  return null;
}

export function isRememberEnabled() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function isAuthenticated() {
  return Boolean(getPassword());
}

export async function validatePassword(candidate) {
  if (!candidate) return false;
  const url = `${API_BASE_URL}/_/verify`;
  try {
    const result = await fetchJSON(url, {
      headers: {
        'Authorization': `Bearer ${candidate}`
      }
    });
    return result.ok && result.data?.ok === true;
  } catch (_) {
    return false;
  }
}

export async function login(candidate, { remember = true } = {}) {
  const valid = await validatePassword(candidate);
  if (!valid) return false;

  cachedPassword = candidate;

  try {
    if (remember) {
      localStorage.setItem(PASSWORD_KEY, candidate);
      localStorage.setItem(REMEMBER_KEY, '1');
      sessionStorage.removeItem(SESSION_FLAG);
    } else {
      sessionStorage.setItem(SESSION_FLAG, candidate);
      localStorage.removeItem(PASSWORD_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch (_) {}

  return true;
}

export function logout() {
  clearAllStorage();
}

export function buildKeyedUrl(path, params = {}) {
  const key = getPassword();
  const url = new URL(path || '/', API_BASE_URL);
  if (key) {
    url.searchParams.set('key', key);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}