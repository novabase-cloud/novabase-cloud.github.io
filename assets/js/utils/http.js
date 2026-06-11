import { STORAGE_KEYS } from '../config.js';

let onUnauthorized = null;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

function getStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.HF_TOKEN);
  } catch (_) {
    return null;
  }
}

function handleUnauthorized() {
  if (typeof onUnauthorized === 'function') {
    onUnauthorized();
  }
}

/**
 * Enhanced fetch wrapper with automatic token injection and error handling.
 */
async function request(url, options = {}) {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  // Auto-inject Authorization header if not present and token exists
  const token = getStoredToken();
  const headers = new Headers(fetchOptions.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token.trim()}`);
  }
  
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(id);

    if (response.status === 401) {
      handleUnauthorized();
    }

    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  }
}

export async function fetchJSON(url, options = {}) {
  try {
    const response = await request(url, options);
    const text = await response.text();
    let data = null;
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      raw: text,
      response
    };
  } catch (err) {
    throw err;
  }
}

export async function fetchRaw(url, options = {}) {
  return request(url, options);
}
