export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

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
  return fetch(url, options);
}
