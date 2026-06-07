import { $, el, mount } from './utils/dom.js';
import { initTheme } from './theme.js';
import { isAuthenticated } from './auth.js';
import { initRouter } from './router.js';
import { store } from './store.js';
import { renderLogin, initLogin } from './ui/login.js';
import { renderHeader, initHeader, syncHeaderTheme } from './ui/header.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderToolbar } from './ui/toolbar.js';
import { renderBreadcrumb } from './ui/breadcrumb.js';
import { renderTable } from './ui/table.js';
import { renderPagination } from './ui/pagination.js';

const root = $('#app');
let slots = null;

function buildAppShell() {
  const header = renderHeader();
  const sidebar = renderSidebar();

  const toolbarSlot = el('div', { id: 'slot-toolbar' });
  const breadcrumbSlot = el('div', { id: 'slot-breadcrumb' });
  const tableSlot = el('div', { id: 'slot-table' });
  const paginationSlot = el('div', { id: 'slot-pagination' });

  const footer = el('footer', { class: 'app-footer' }, '&copy; 2026 Novabase Storage Hub. Built with Cloudflare Workers API Proxy.');

  const main = el('main', { class: 'app-main' }, [
    el('div', { class: 'page-header' }, [
      el('h1', { class: 'page-title' }, 'Novabase/Tiktok Explorer'),
      el('p', { class: 'page-subtitle' }, 'Kelola dan telusuri objek file media, sub-folder, serta metadata dengan Cloudflare Worker proxy.')
    ]),
    toolbarSlot,
    breadcrumbSlot,
    tableSlot,
    paginationSlot
  ]);

  const body = el('div', { class: 'app-body' }, [sidebar, main]);
  const shell = el('div', { class: 'app-shell' }, [header, body, footer]);

  return { shell, toolbarSlot, breadcrumbSlot, tableSlot, paginationSlot };
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

function showLoginScreen() {
  mount(root, el('div', { id: 'login-container' }));
  initLogin(() => {
    showApp();
  });
  renderLogin($('#login-container'));
}

function showApp() {
  store.reset();
  slots = buildAppShell();
  mount(root, slots.shell);
  initHeader(() => {
    showLoginScreen();
  });

  renderToolbarOnce(store.state);
  renderBreadcrumbArea(store.state);
  renderTableArea(store.state);
  syncHeaderTheme();

  store.subscribe((state) => {
    renderBreadcrumbArea(state);
    renderTableArea(state);
  });

  initRouter();
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
