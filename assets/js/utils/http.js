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
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

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
}

export async function fetchRaw(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    handleUnauthorized();
  }

  return response;
}
