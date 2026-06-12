import { fetchRaw } from './http.js';

const store = new Map();
const statusListeners = new Map();
let pendingUrls = [];

export const imageCache = {
  get(path) {
    const entry = store.get(path);
    return entry?.blob || null;
  },

  getStatus(path) {
    const entry = store.get(path);
    if (!entry) return 'idle';
    return entry.status;
  },

  has(path) {
    const entry = store.get(path);
    return !!entry?.blob;
  },

  subscribe(path, fn) {
    if (!statusListeners.has(path)) {
      statusListeners.set(path, new Set());
    }
    statusListeners.get(path).add(fn);
    return () => statusListeners.get(path)?.delete(fn);
  },

  _notify(path) {
    const fns = statusListeners.get(path);
    if (!fns) return;
    const entry = store.get(path);
    for (const fn of fns) {
      try {
        fn(entry || null);
      } catch (e) {
        console.warn('[imageCache] listener error', e);
      }
    }
  },

  async fetch(path, url) {
    if (!path || !url) throw new Error('imageCache.fetch requires path and url');

    const existing = store.get(path);
    if (existing?.blob) return existing.blob;
    if (existing?.promise) return existing.promise;

    const promise = (async () => {
      try {
        store.set(path, { blob: null, promise: null, status: 'loading', timestamp: Date.now() });
        this._notify(path);

        const response = await fetchRaw(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const entry = store.get(path);
        if (entry) {
          entry.blob = blob;
          entry.status = 'done';
          entry.promise = null;
        }
        this._notify(path);
        return blob;
      } catch (err) {
        store.delete(path);
        this._notify(path);
        throw err;
      }
    })();

    store.set(path, { blob: null, promise, status: 'loading', timestamp: Date.now() });
    this._notify(path);
    return promise;
  },

  createObjectUrl(path) {
    const entry = store.get(path);
    if (!entry?.blob) return null;
    const url = URL.createObjectURL(entry.blob);
    pendingUrls.push(url);
    return url;
  },

  revokePendingUrls() {
    for (const url of pendingUrls) {
      URL.revokeObjectURL(url);
    }
    pendingUrls = [];
  },

  set(path, blob) {
    if (!path || !blob) return;
    const existing = store.get(path);
    if (existing?.blob) return;
    store.set(path, { blob, promise: null, status: 'done', timestamp: Date.now() });
    this._notify(path);
  },

  clear() {
    this.revokePendingUrls();
    store.clear();
    statusListeners.clear();
  }
};
