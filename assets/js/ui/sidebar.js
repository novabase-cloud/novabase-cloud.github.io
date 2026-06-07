import { el, icon } from '../utils/dom.js';
import { navigate, parseHash } from '../router.js';
import { store } from '../store.js';

const ICONS = {
  folder: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
};

function isSettingsActive() {
  return parseHash().path === 'settings';
}

function isDashboardActive() {
  const p = parseHash().path;
  return p !== 'settings';
}

function navLink({ label, iconPath, isActive, onClick }) {
  return el(
    'a',
    {
      href: '#',
      class: `sidebar-link${isActive ? ' is-active' : ''}`,
      'data-nav': label,
      onClick: (e) => {
        e.preventDefault();
        if (onClick) onClick();
      }
    },
    [icon(iconPath, 18), el('span', {}, label)]
  );
}

function buildSidebar() {
  const goRoot = () => navigate({ path: '', search: '', extension: '', sort: '', page: 1 });
  const goSettings = () => navigate({ path: 'settings', search: '', extension: '', sort: '', page: 1 });

  const storageLink = navLink({
    label: 'Storage',
    iconPath: ICONS.folder,
    isActive: isDashboardActive(),
    onClick: goRoot
  });

  const analyticsLink = navLink({
    label: 'Analytics',
    iconPath: ICONS.chart,
    isActive: false
  });

  const settingsLink = navLink({
    label: 'Settings',
    iconPath: ICONS.settings,
    isActive: isSettingsActive(),
    onClick: goSettings
  });

  const sidebar = el('aside', { class: 'app-sidebar', id: 'app-sidebar' }, [
    el('div', { class: 'sidebar-header-mobile' }, [
      el('span', { class: 'sidebar-header-mobile-title' }, 'Menu'),
      el(
        'button',
        {
          type: 'button',
          class: 'app-icon-button',
          'aria-label': 'Close menu',
          onClick: closeSidebar
        },
        [icon(ICONS.close, 18)]
      )
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Data products'),
      el('nav', { class: 'sidebar-nav' }, [storageLink, analyticsLink])
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Management'),
      el('nav', { class: 'sidebar-nav' }, [settingsLink])
    ])
  ]);

  return { sidebar, storageLink, settingsLink, analyticsLink };
}

let _storageLink = null;
let _settingsLink = null;
let _analyticsLink = null;

function syncActive() {
  const dashActive = isDashboardActive();
  const settingsActive = isSettingsActive();
  if (_storageLink) _storageLink.classList.toggle('is-active', dashActive);
  if (_settingsLink) _settingsLink.classList.toggle('is-active', settingsActive);
}

export function renderSidebar() {
  const built = buildSidebar();
  _storageLink = built.storageLink;
  _settingsLink = built.settingsLink;
  _analyticsLink = built.analyticsLink;
  store.subscribe(syncActive);
  window.addEventListener('hashchange', syncActive);
  return built.sidebar;
}

export function openSidebar() {
  document.body.classList.add('sidebar-open');
}

export function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

export function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
}
