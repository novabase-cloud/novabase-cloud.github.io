import { store } from './store.js';
import { listFolder } from './api.js';
import { DEFAULT_REPO } from './config.js';
import { getSettings } from './settings.js';

const handlers = new Set();
let currentToken = 0;
let viewHandler = null;

export function onRouteChange(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export function onViewChange(fn) {
  viewHandler = fn;
  return () => {
    if (viewHandler === fn) viewHandler = null;
  };
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
    page: parseInt(params.get('page') || '1', 10) || 1,
    repo: params.get('repo') || DEFAULT_REPO.id,
    repo_type: params.get('type') || DEFAULT_REPO.type
  };
}

function buildHash({ path, search, extension, sort, page, repo, repo_type }) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (extension) params.set('ext', extension);
  if (sort) params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  if (repo && repo !== DEFAULT_REPO.id) params.set('repo', repo);
  if (repo_type && repo_type !== DEFAULT_REPO.type) params.set('type', repo_type);
  const base = path ? `/${path}` : '/';
  const qs = params.toString();
  return `#${base}${qs ? `?${qs}` : ''}`;
}

export function navigate({ path, search, extension, sort, page, repo, repo_type }) {
  const s = getSettings();
  const next = buildHash({
    path,
    search,
    extension,
    sort,
    page: page || 1,
    repo: repo || store.state.repo?.id || s.lastRepo || DEFAULT_REPO.id,
    repo_type: repo_type || store.state.repo?.type || s.lastRepoType || DEFAULT_REPO.type
  });
  if (next !== window.location.hash) {
    window.location.hash = next;
  } else {
    handleRoute();
  }
}

function isSettingsRoute(parsed) {
  return parsed.path === 'settings' || parsed.path === '__settings';
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

function emitViewChange(view) {
  if (typeof viewHandler === 'function') {
    try {
      viewHandler(view);
    } catch (err) {
      console.error('[router] view handler error', err);
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
    page: parsed.page,
    repo: { id: parsed.repo, type: parsed.repo_type }
  });

  try {
    const data = await listFolder({
      path: parsed.path,
      search: parsed.search,
      extension: parsed.extension,
      sort: parsed.sort,
      page: parsed.page,
      limit: 25,
      repo: parsed.repo,
      repo_type: parsed.repo_type
    });
    if (token !== currentToken) return;
    store.set({ loading: false, data, error: null });
  } catch (err) {
    if (token !== currentToken) return;
    const status = err.status;
    if (status === 401) {
      store.set({ loading: false, error: 'unauthorized' });
    } else {
      store.set({ loading: false, error: err.message || 'Failed to load data' });
    }
  }
}

function handleRoute() {
  const parsed = parseHash();
  emit(parsed);

  if (isSettingsRoute(parsed)) {
    currentToken++;
    store.set({ loading: false });
    store.set({ repo: { id: parsed.repo, type: parsed.repo_type } });
    emitViewChange('settings');
    return;
  }

  emitViewChange('dashboard');
  loadListing(parsed);
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  if (!window.location.hash || window.location.hash === '#') {
    const s = getSettings();
    const hash = buildHash({ path: '', repo: s.lastRepo || DEFAULT_REPO.id, repo_type: s.lastRepoType || DEFAULT_REPO.type });
    window.location.hash = hash;
  } else {
    handleRoute();
  }
}

export function reload() {
  handleRoute();
}

export { parseHash, buildHash };
