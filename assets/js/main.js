import { $, el, mount } from './utils/dom.js';
import { initTheme } from './theme.js';
import { isAuthenticated } from './auth.js';
import { initRouter, onViewChange } from './router.js';
import { store } from './store.js';
import { renderLogin, initLogin } from './ui/login.js';
import { renderHeader, initHeader, syncHeaderTheme } from './ui/header.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderToolbar } from './ui/toolbar.js';
import { renderBreadcrumb } from './ui/breadcrumb.js';
import { renderTable } from './ui/table.js';
import { renderPagination } from './ui/pagination.js';
import { renderSettingsView } from './ui/settings.js';
import { subscribe as subscribeSettings } from './settings.js';
import { closeSidebar } from './ui/sidebar.js';

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
      el('span', null, [
        'index.html: ',
        el('code', { id: 'footer-hash', class: 'footer-hash' }, ['computing…'])
      ])
    ])
  ]);

  const main = el('main', { class: 'app-main' }, [
    el('div', { class: 'page-header' }, [
      el('h1', { class: 'page-title' }, 'Novabase / TikTok Explorer'),
      el('p', { class: 'page-subtitle' }, 'Browse and manage media files, sub-folders, and metadata through the Cloudflare Workers API proxy.')
    ]),
    el('div', { id: 'view-dashboard' }, [
      toolbarSlot,
      breadcrumbSlot,
      tableSlot,
      paginationSlot
    ]),
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
  mount(slots.tableSlot, renderTable({
    items: state.data?.results || [],
    path: state.path,
    loading: state.loading,
    error: state.error
  }));

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
    path: state.path
  }));
}

function renderSettingsViewIfNeeded() {
  if (lastRenderedView === 'settings') return;
  mount(slots.settingsSlot, renderSettingsView());
  updateFooterHash();
  lastRenderedView = 'settings';
}

function refreshSettingsView() {
  mount(slots.settingsSlot, renderSettingsView());
  updateFooterHash();
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
  initHeader(() => {
    showLoginScreen();
  });

  renderDashboardIfNeeded(store.state);
  syncHeaderTheme();

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
    const hex = Array.from(bytes.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    target.textContent = hex;
  } catch (err) {
    target.textContent = 'unavailable';
  }
}

function updateFooterHash() {
  computeFooterHash();
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
