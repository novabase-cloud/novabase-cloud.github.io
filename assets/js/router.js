import { store } from './store.js';
import { listFolder } from './api.js';

const handlers = new Set();
let currentToken = 0;

export function onRouteChange(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

function parseHash() {
  const raw = window.location.hash || '#/';
  const path = raw.startsWith('#') ? raw.slice(1) : raw;
  const [base, queryString = ''] = path.split('?');
  const cleanPath = (base || '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const params = new URLSearchParams(queryString);
  return {
    path: cleanPath,
    search: params.get('q') || '',
    extension: params.get('ext') || '',
    sort: params.get('sort') || '',
    page: parseInt(params.get('page') || '1', 10) || 1
  };
}

function buildHash({ path, search, extension, sort, page }) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (extension) params.set('ext', extension);
  if (sort) params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  const base = path ? `/${path}` : '/';
  const qs = params.toString();
  return `#${base}${qs ? `?${qs}` : ''}`;
}

export function navigate({ path, search, extension, sort, page }) {
  const next = buildHash({ path, search, extension, sort, page });
  if (next !== window.location.hash) {
    window.location.hash = next;
  } else {
    handleRoute();
  }
}

function emit(parsed) {
  for (const fn of handlers) {
    try {
      fn(parsed);
    } catch (err) {
      console.error('[router] handler error', err);
    }
  }
}

async function loadListing(parsed) {
  const token = ++currentToken;
  store.set({
    loading: true,
    error: null,
    path: parsed.path,
    search: parsed.search,
    extension: parsed.extension,
    sort: parsed.sort,
    page: parsed.page
  });

  try {
    const data = await listFolder({
      path: parsed.path,
      search: parsed.search,
      extension: parsed.extension,
      sort: parsed.sort,
      page: parsed.page
    });
    if (token !== currentToken) return;
    store.set({ loading: false, data, error: null });
  } catch (err) {
    if (token !== currentToken) return;
    const status = err.status;
    if (status === 401) {
      store.set({ loading: false, error: 'unauthorized' });
    } else {
      store.set({ loading: false, error: err.message || 'Gagal memuat data' });
    }
  }
}

function handleRoute() {
  const parsed = parseHash();
  emit(parsed);
  loadListing(parsed);
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  if (!window.location.hash) {
    window.location.hash = '#/';
  } else {
    handleRoute();
  }
}

export function reload() {
  handleRoute();
}
