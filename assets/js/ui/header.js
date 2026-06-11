import { el, icon } from '../utils/dom.js';
import { toggleTheme } from '../theme.js';
import { logout } from '../auth.js';
import { store } from '../store.js';
import { showToast } from './toast.js';
import { toggleSidebar } from './sidebar.js';

const ICONS = {
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>',
  sun: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line>'
};

let onLogoutCallback = null;

export function initHeader(onLogout) {
  onLogoutCallback = onLogout;
}

export function renderHeader() {
  const themeIcon = el('span', {}, [icon(ICONS.moon, 18)]);

  const themeBtn = el(
    'button',
    {
      class: 'app-icon-button',
      'aria-label': 'Toggle theme',
      title: 'Toggle theme',
      onClick: () => {
        const next = toggleTheme();
        updateThemeIcon(themeIcon, next);
      }
    },
    [themeIcon]
  );

  const logoutBtn = el(
    'button',
    {
      class: 'app-icon-button',
      'aria-label': 'Logout',
      title: 'Logout',
      onClick: () => {
        logout();
        showToast({ kind: 'info', message: 'Session ended, please log in again.' });
        if (typeof onLogoutCallback === 'function') onLogoutCallback();
      }
    },
    [icon(ICONS.logout, 18)]
  );

  const menuBtn = el(
    'button',
    {
      class: 'app-icon-button app-icon-button-mobile',
      'aria-label': 'Open menu',
      title: 'Menu',
      onClick: () => toggleSidebar()
    },
    [icon(ICONS.menu, 18)]
  );

  const userLabel = el('p', { class: 'app-header-user-label' }, 'Authenticated User');
  const userName = el('p', { class: 'app-header-user-name' }, 'Loading...');
  const avatarSlot = el('div', { class: 'app-avatar' }, 'U');

  const updateUserInfo = (user) => {
    if (!user) return;
    userName.textContent = user.fullname || user.name || 'Hugging Face User';
    userLabel.textContent = user.type || 'User';
    
    avatarSlot.innerHTML = '';
    if (user.avatarUrl) {
      avatarSlot.appendChild(el('img', { 
        src: user.avatarUrl, 
        alt: user.name,
        style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }
      }));
    } else {
      avatarSlot.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }
  };

  updateUserInfo(store.state.user);
  store.subscribe((state) => {
    if (state.user) updateUserInfo(state.user);
  });

  return el('header', { class: 'app-header' }, [
    el('div', { class: 'app-header-left' }, [
      menuBtn,
      el('div', { class: 'app-header-brand' }, [
        el('div', { class: 'app-header-icon' }, [icon(ICONS.database, 18)]),
        el('span', { class: 'app-header-title' }, 'Novabase Hub'),
        el('span', { class: 'app-header-version' }, 'v1.0.0')
      ])
    ]),
    el('div', { class: 'app-header-right' }, [
      el('div', { class: 'app-header-user' }, [
        userLabel,
        userName
      ]),
      el('div', { class: 'app-header-actions' }, [themeBtn, logoutBtn, avatarSlot])
    ])
  ]);
}

function updateThemeIcon(target, theme) {
  if (!target) return;
  target.innerHTML = '';
  target.appendChild(icon(theme === 'dark' ? ICONS.sun : ICONS.moon, 18));
}

export function syncHeaderTheme() {
  const current = store.state.theme;
  const iconSpan = document.querySelector('.app-header-actions .app-icon-button:first-child span');
  if (iconSpan) updateThemeIcon(iconSpan, current);
}
