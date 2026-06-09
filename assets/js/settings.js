import { STORAGE_KEYS } from './config.js';

const SETTINGS_KEY = STORAGE_KEYS.SETTINGS;

const DEFAULTS = {
  sizeFormat: 'binary',
  showHidden: false,
  defaultSort: '',
  itemsPerPage: 25,
  recentSearches: [],
  compactList: false,
  defaultView: 'table',
  lastRepo: null,
  lastRepoType: 'dataset',
  customRepos: []
};

const MAX_RECENT_SEARCHES = 10;

const listeners = new Set();
let cache = null;

export const CHANNELS = {
  RECENT_SEARCHES: 'recentSearches'
};

function read() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULTS, ...parsed };
    }
  } catch (_) {
  }
  return { ...DEFAULTS };
}

function write(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {
  }
}

function emit(channel) {
  for (const fn of listeners) {
    try {
      fn(cache, channel);
    } catch (err) {
      console.error('[settings] listener error', err);
    }
  }
}

export function getSettings() {
  if (!cache) cache = read();
  return cache;
}

export function updateSettings(patch) {
  if (!cache) cache = read();
  cache = { ...cache, ...patch };
  write(cache);
  const channel = 'recentSearches' in patch ? CHANNELS.RECENT_SEARCHES : 'all';
  emit(channel);
}

export function resetSettings() {
  cache = { ...DEFAULTS };
  write(cache);
  emit();
}

export function addRecentSearch(query, path) {
  if (!query || !query.trim()) return;
  const normalized = query.trim();
  const settings = getSettings();
  const filtered = settings.recentSearches.filter((s) => s.query !== normalized);
  filtered.unshift({ query: normalized, path: path || '', timestamp: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENT_SEARCHES);
  updateSettings({ recentSearches: trimmed });
}

export function removeRecentSearch(query) {
  const settings = getSettings();
  const filtered = settings.recentSearches.filter((s) => s.query !== query);
  updateSettings({ recentSearches: filtered });
}

export function clearRecentSearches() {
  updateSettings({ recentSearches: [] });
}

export function addCustomRepo(id, type) {
  if (!id || !id.trim()) return;
  const normalized = id.trim();
  const settings = getSettings();
  const existing = settings.customRepos.find((r) => r.id === normalized);
  if (existing) return;
  const updated = [...settings.customRepos, { id: normalized, type: type || 'dataset', addedAt: Date.now() }];
  updateSettings({ customRepos: updated });
}

export function removeCustomRepo(id) {
  if (!id) return;
  const settings = getSettings();
  const filtered = settings.customRepos.filter((r) => r.id !== id);
  updateSettings({ customRepos: filtered });
}

export function getCustomRepos() {
  return getSettings().customRepos || [];
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const SETTINGS_DEFAULTS = DEFAULTS;
export const RECENT_SEARCH_LIMIT = MAX_RECENT_SEARCHES;
