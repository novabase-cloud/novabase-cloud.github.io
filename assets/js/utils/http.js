import { logout } from '../auth.js';

let onUnauthorized = null;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

function handleUnauthorized() {
  logout();
  if (typeof onUnauthorized === 'function') {
    onUnauthorized();
  }
}

export async function fetchJSON(url, options = {}) {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(fetchOptions.headers || {})
      }
    });
    clearTimeout(id);

    if (response.status === 401) {
      handleUnauthorized();
    }

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
    clearTimeout(id);
    throw err;
  }
}

export async function fetchRaw(url, options = {}) {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);

    if (response.status === 401) {
      handleUnauthorized();
    }

    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
