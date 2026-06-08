import { DEFAULTS, DEFAULT_REPO } from './config.js';

const listeners = new Set();

export const store = {
  state: {
    password: null,
    theme: 'light',
    path: DEFAULTS.PATH,
    search: DEFAULTS.SEARCH,
    extension: DEFAULTS.EXTENSION,
    sort: DEFAULTS.SORT,
    page: DEFAULTS.PAGE,
    limit: DEFAULTS.ITEMS_PER_PAGE,
    loading: false,
    error: null,
    data: null,
    viewMode: 'table',
    repo: { ...DEFAULT_REPO },
    repos: []
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  emit() {
    for (const fn of listeners) {
      try {
        fn(this.state);
      } catch (err) {
        console.error('[store] listener error', err);
      }
    }
  },

  set(patch) {
    this.state = { ...this.state, ...patch };
    this.emit();
  },

  reset() {
    this.set({
      path: DEFAULTS.PATH,
      search: DEFAULTS.SEARCH,
      extension: DEFAULTS.EXTENSION,
      sort: DEFAULTS.SORT,
      page: DEFAULTS.PAGE,
      loading: false,
      error: null,
      data: null
    });
  }
};
