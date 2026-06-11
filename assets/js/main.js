import { $, el, icon, mount } from './utils/dom.js';
import { initTheme } from './theme.js';
import { isAuthenticated, loginWithCode, validateToken, logout } from './auth.js';
import { initRouter, navigate, onViewChange } from './router.js';
import { store } from './store.js';
import { renderLogin, initLogin } from './ui/login.js';
import { renderHeader, initHeader, syncHeaderTheme } from './ui/header.js';
import { renderSidebar, closeSidebar } from './ui/sidebar.js';
import { renderToolbar } from './ui/toolbar.js';
import { renderBreadcrumb } from './ui/breadcrumb.js';
import { renderTable } from './ui/table.js';
import { renderGrid } from './ui/grid.js';
import { renderPagination } from './ui/pagination.js';
import { renderSettingsView } from './ui/settings.js';
import { getSettings, updateSettings, getCustomRepos, subscribe as subscribeSettings } from './settings.js';
import { fetchRepos } from './api.js';
import { setOnUnauthorized } from './utils/http.js';

const root = $('#app');
let slots = null;
let currentView = 'dashboard';
let lastRenderedView = null;

function buildAppShell() {
  const header = renderHeader();
  const sidebar = renderSidebar();

  const toolbarSlot = el('div', { id: 'slot-toolbar' });
  const breadcrumbSlot = el('div', { id: 'slot-breadcrumb' });
  const tableSlot = el('div', { id: 'slot-table' });
  const paginationSlot = el('div', { id: 'slot-pagination' });
  const settingsSlot = el('div', { id: 'slot-settings' });

  const footer = el('footer', { class: 'app-footer' }, [
    el('div', { class: 'app-footer-inner' }, [
      el('span', null, ['© 2026 Novabase Storage Hub.']),
      el('span', { class: 'app-footer-sep' }, '·'),
      el('span', null, ['index.html: ', el('code', { id: 'footer-hash', class: 'footer-hash' }, ['computing…'])])
    ])
  ]);

  const main = el('main', { class: 'app-main' }, [
    el('div', { class: 'page-header' }, [
      el('h1', { class: 'page-title' }, 'Novabase / Hugging Face Explorer'),
      el('p', { class: 'page-subtitle' }, 'Browse and manage files across your Hugging Face repositories through the Cloudflare Workers API proxy.')
    ]),
    el('div', { id: 'view-dashboard' }, [toolbarSlot, breadcrumbSlot, tableSlot, paginationSlot]),
    el('div', { id: 'view-settings', style: { display: 'none' } }, [settingsSlot])
  ]);

  const body = el('div', { class: 'app-body' }, [sidebar, main]);
  const backdrop = el('div', {
    class: 'sidebar-backdrop',
    onClick: () => document.body.classList.remove('sidebar-open')
  });
  const shell = el('div', { class: 'app-shell' }, [header, body, backdrop, footer]);

  return { shell, toolbarSlot, breadcrumbSlot, tableSlot, paginationSlot, settingsSlot };
}

function setActiveView(view) {
  currentView = view;
  const dash = document.getElementById('view-dashboard');
  const settings = document.getElementById('view-settings');
  if (dash) dash.style.display = view === 'dashboard' ? '' : 'none';
  if (settings) settings.style.display = view === 'settings' ? '' : 'none';
}

const FOLDER_ICON = '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>';

function renderStorageView() {
  const repos = getCustomRepos();

  if (!repos.length) {
    return el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, ['📦']),
      el('h3', {}, 'No Repositories Yet'),
      el('p', {}, 'Add a repository from the sidebar to start browsing files.'),
      el('button', {
        class: 'btn btn-primary',
        onClick: () => { document.querySelector('.sidebar-add-repo-btn')?.click(); }
      }, 'Add Repository')
    ]);
  }

  const cards = repos.map((repo) =>
    el('div', {
      class: 'file-card is-folder has-kebab',
      tabindex: '0',
      role: 'button',
      onClick: (e) => {
        e.preventDefault();
        updateSettings({ lastRepo: repo.id, lastRepoType: repo.type });
        navigate({ path: '', repo: repo.id, repo_type: repo.type });
      },
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          updateSettings({ lastRepo: repo.id, lastRepoType: repo.type });
          navigate({ path: '', repo: repo.id, repo_type: repo.type });
        }
      }
    }, [
      el('div', { class: 'card-thumb card-thumb-folder' }, [
        el('span', { class: 'card-folder-icon' }, [icon(FOLDER_ICON, 36)])
      ]),
      el('div', { class: 'card-content' }, [
        el('div', { class: 'card-name' }, [
          el('span', { class: 'card-name-text' }, repo.id)
        ]),
        el('div', { class: 'card-meta' }, [
          el('span', { class: 'badge badge-type' }, repo.type || 'dataset')
        ])
      ])
    ])
  );

  return el('div', { class: 'file-grid-wrap' }, [
    el('div', { class: 'file-grid' }, cards),
    el('div', { class: 'grid-footer' }, [
      el('span', {}, `${repos.length} repositor${repos.length !== 1 ? 'ies' : 'y'}`)
    ])
  ]);
}

function renderTableArea(state) {
  if (state.navView === 'storage') {
    mount(slots.tableSlot, renderStorageView());
    mount(slots.paginationSlot, null);
    return;
  }

  const viewMode = state.viewMode || 'table';
  const items = state.data?.results || [];

  if (!state.repo?.id) {
    const prompt = el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, ['📁']),
      el('h3', {}, 'No Repository Selected'),
      el('p', {}, 'Add a Hugging Face repository from the sidebar to start browsing.'),
      el('button', { class: 'btn btn-primary', onClick: () => { document.querySelector('.sidebar-add-repo-btn')?.click(); } }, 'Add Repository')
    ]);
    mount(slots.tableSlot, prompt);
    mount(slots.paginationSlot, null);
    return;
  }

  if (viewMode === 'grid') {
    mount(slots.tableSlot, renderGrid({ items, path: state.path, loading: state.loading, error: state.error }));
  } else {
    mount(slots.tableSlot, renderTable({ items, path: state.path, loading: state.loading, error: state.error }));
  }

  if (state.data?.pagination) {
    mount(slots.paginationSlot, renderPagination({
      pagination: state.data.pagination,
      path: state.path,
      search: state.search,
      extension: state.extension,
      sort: state.sort
    }));
  } else {
    mount(slots.paginationSlot, null);
  }
}

function renderBreadcrumbArea(state) {
  if (state.navView === 'storage') {
    mount(slots.breadcrumbSlot, el('div', { class: 'breadcrumb' }, [
      el('span', { class: 'breadcrumb-item is-current' }, [
        icon(FOLDER_ICON, 14),
        el('span', {}, 'Storage')
      ])
    ]));
    return;
  }
  mount(slots.breadcrumbSlot, renderBreadcrumb(state.path));
}

function renderToolbarOnce(state) {
  mount(slots.toolbarSlot, renderToolbar({
    search: state.search,
    extension: state.extension,
    sort: state.sort,
    path: state.path,
    viewMode: state.viewMode
  }));
}

function refreshSettingsView() {
  mount(slots.settingsSlot, renderSettingsView());
  computeFooterHash();
}

function renderSettingsViewIfNeeded() {
  if (lastRenderedView === 'settings') return;
  mount(slots.settingsSlot, renderSettingsView());
  computeFooterHash();
  lastRenderedView = 'settings';
}

function renderDashboardIfNeeded(state) {
  if (lastRenderedView === 'dashboard') return;
  renderToolbarOnce(state);
  renderBreadcrumbArea(state);
  renderTableArea(state);
  lastRenderedView = 'dashboard';
}

function handleViewChange(view) {
  setActiveView(view);
  if (view === 'settings') {
    renderSettingsViewIfNeeded();
  } else {
    renderDashboardIfNeeded(store.state);
  }
  closeSidebar();
}

async function loadUserRepos() {
  try {
    const repos = await fetchRepos();
    if (repos.length > 0) {
      store.set({ repos });
    }
  } catch (_) {
  }
}

function showLoginScreen() {
  mount(root, el('div', { id: 'login-container' }));
  initLogin(() => {
    showApp();
  });
  renderLogin($('#login-container'));
}

function showApp() {
  store.reset();
  lastRenderedView = null;
  slots = buildAppShell();
  mount(root, slots.shell);
  initHeader(() => { showLoginScreen(); });

  const s = getSettings();
  const initialView = s.defaultView || 'table';
  const initialRepo = s.lastRepo ? { id: s.lastRepo, type: s.lastRepoType || 'dataset' } : null;
  store.set({
    viewMode: initialView,
    repo: initialRepo
  });

  renderDashboardIfNeeded(store.state);
  syncHeaderTheme();
  loadUserRepos();

  store.subscribe((state) => {
    if (currentView === 'dashboard') {
      slots.toolbarSlot.style.display = state.navView === 'storage' ? 'none' : '';
      renderBreadcrumbArea(state);
      renderTableArea(state);
    }
  });

  subscribeSettings((settings, channel) => {
    if (currentView === 'dashboard') {
      renderTableArea(store.state);
    } else if (channel === 'recentSearches') {
      refreshSettingsView();
      lastRenderedView = 'settings';
    }
  });

  store.subscribe((state) => {
    const viewToggles = document.querySelectorAll('.view-toggle-btn');
    viewToggles.forEach((btn) => {
      const isTable = btn.querySelector('svg path')?.getAttribute('d')?.includes('M3 3h18');
      btn.classList.toggle('is-active',
        (isTable && state.viewMode === 'table') ||
        (!isTable && state.viewMode === 'grid')
      );
    });
  });

  onViewChange(handleViewChange);
  initRouter();
  computeFooterHash();
}

async function computeFooterHash() {
  const target = document.getElementById('footer-hash');
  if (!target) return;
  try {
    const res = await fetch(window.location.pathname, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch index.html');
    const text = await res.text();
    const buf = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(digest);
    const hex = Array.from(bytes.slice(0, 4)).map((b) => b.toString(16).padStart(2, '0')).join('');
    target.textContent = hex;
  } catch (_) {
    target.textContent = 'unavailable';
  }
}

async function handleOAuthCallback() {
  // Check both search and hash for 'code' (common in hash-based routing)
  const urlParams = new URLSearchParams(window.location.search);
  let code = urlParams.get('code');
  let state = urlParams.get('state');
  
  if (!code && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    code = hashParams.get('code');
    state = state || hashParams.get('state');
  } else if (!code && window.location.hash.includes('code=')) {
    // Some providers might not use ? after #
    const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('code=')));
    code = hashParams.get('code');
    state = state || hashParams.get('state');
  }

  if (code) {
    // Validate state to prevent CSRF
    const storedState = localStorage.getItem('huggingface_oauth_state');
    localStorage.removeItem('huggingface_oauth_state');
    if (storedState && state !== storedState) {
      console.warn('[auth] State mismatch — possible CSRF attack');
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname + window.location.hash.split('?')[0]);
      return false;
    }

    // Clear code from URL for security and aesthetics
    const cleanUrl = window.location.origin + window.location.pathname + window.location.hash.split('?')[0];
    window.history.replaceState({}, document.title, cleanUrl);
    
    const success = await loginWithCode(code);
    return success;
  }
  return false;
}

async function verifyAuthOnStartup() {
  // 1. Check if we are returning from OAuth login
  const oauthSuccess = await handleOAuthCallback();
  if (oauthSuccess) {
    window.location.replace('#/_storage');
    return true;
  }

  // 2. Check existing session
  if (!isAuthenticated()) return false;
  
  // 3. Validate existing token
  const valid = await validateToken();
  if (!valid) {
    logout();
    return false;
  }
  return true;
}

function bootstrap() {
  initTheme();

  setOnUnauthorized(() => {
    showLoginScreen();
  });

  verifyAuthOnStartup().then((authed) => {
    if (authed) {
      showApp();
    } else {
      showLoginScreen();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
