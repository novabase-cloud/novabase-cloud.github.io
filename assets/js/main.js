import { $, el, mount } from './utils/dom.js';
import { initTheme } from './theme.js';
import { isAuthenticated } from './auth.js';
import { initRouter, onViewChange } from './router.js';
import { store } from './store.js';
import { DEFAULT_REPO } from './config.js';
import { renderLogin, initLogin } from './ui/login.js';
import { renderHeader, initHeader, syncHeaderTheme } from './ui/header.js';
import { renderSidebar, closeSidebar } from './ui/sidebar.js';
import { renderToolbar } from './ui/toolbar.js';
import { renderBreadcrumb } from './ui/breadcrumb.js';
import { renderTable } from './ui/table.js';
import { renderGrid } from './ui/grid.js';
import { renderPagination } from './ui/pagination.js';
import { renderSettingsView } from './ui/settings.js';
import { getSettings, updateSettings, subscribe as subscribeSettings } from './settings.js';
import { fetchRepos } from './api.js';

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

function renderTableArea(state) {
  const viewMode = state.viewMode || 'table';
  const items = state.data?.results || [];

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
  store.set({
    viewMode: initialView,
    repo: { id: s.lastRepo || DEFAULT_REPO.id, type: s.lastRepoType || DEFAULT_REPO.type }
  });

  renderDashboardIfNeeded(store.state);
  syncHeaderTheme();
  loadUserRepos();

  store.subscribe((state) => {
    if (currentView === 'dashboard') {
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

function bootstrap() {
  initTheme();
  if (isAuthenticated()) {
    showApp();
  } else {
    showLoginScreen();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
