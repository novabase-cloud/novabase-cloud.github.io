import { STORAGE_KEYS, API_BASE_URL } from './config.js';
import { fetchJSON } from './utils/http.js';

const SESSION_KEY = STORAGE_KEYS.PASSWORD;
const REMEMBER_KEY = `${STORAGE_KEYS.PASSWORD}.remember`;
const SESSION_FLAG = `${STORAGE_KEYS.PASSWORD}.session`;

let cachedPassword = null;

function readSession() {
  if (cachedPassword) return cachedPassword;
  try {
    cachedPassword = sessionStorage.getItem(SESSION_FLAG);
  } catch (_) {
    cachedPassword = null;
  }
  return cachedPassword;
}

function writeSession(value) {
  cachedPassword = value;
  try {
    if (value) {
      sessionStorage.setItem(SESSION_FLAG, value);
    } else {
      sessionStorage.removeItem(SESSION_FLAG);
    }
  } catch (_) {
  }
}

function readPersistent() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch (_) {
    return null;
  }
}

function writePersistent(value) {
  try {
    if (value) {
      localStorage.setItem(SESSION_KEY, value);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (_) {
  }
}

function readRememberFlag() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function writeRememberFlag(remember) {
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, '1');
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch (_) {
  }
}

export function getPassword() {
  return readSession() || readPersistent();
}

export function isRememberEnabled() {
  return readRememberFlag();
}

export function isAuthenticated() {
  return Boolean(getPassword());
}

export async function validatePassword(candidate) {
  if (!candidate) return false;
  const url = `${API_BASE_URL}/_/verify?key=${encodeURIComponent(candidate)}`;
  try {
    const result = await fetchJSON(url);
    return result.ok && result.data?.ok === true;
  } catch (_) {
    return false;
  }
}

export async function login(candidate, { remember = true } = {}) {
  const valid = await validatePassword(candidate);
  if (!valid) return false;
  writeSession(candidate);
  writeRememberFlag(remember);
  if (remember) {
    writePersistent(candidate);
  } else {
    writePersistent(null);
  }
  return true;
}

export function logout() {
  writeSession(null);
  writePersistent(null);
  writeRememberFlag(false);
}

export function buildKeyedUrl(path, params = {}) {
  const key = getPassword();
  if (!key) {
    throw new Error('Not authenticated');
  }
  const url = new URL(path || '/', API_BASE_URL);
  url.searchParams.set('key', key);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}
