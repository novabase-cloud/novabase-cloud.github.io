import { el, icon } from '../utils/dom.js';
import { navigate } from '../router.js';

const ICONS = {
  folder: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
};

function navLink({ label, iconPath, isActive = false, onClick }) {
  return el(
    'a',
    {
      href: '#',
      class: `sidebar-link${isActive ? ' is-active' : ''}`,
      onClick: (e) => {
        e.preventDefault();
        if (onClick) onClick();
      }
    },
    [icon(iconPath, 18), el('span', {}, label)]
  );
}

export function renderSidebar() {
  const goRoot = () => navigate({ path: '', search: '', extension: '', sort: '', page: 1 });

  const sidebar = el('aside', { class: 'app-sidebar' }, [
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Data Products'),
      el('nav', { class: 'sidebar-nav' }, [
        navLink({
          label: 'Storage',
          iconPath: ICONS.folder,
          isActive: true,
          onClick: goRoot
        }),
        navLink({
          label: 'Analytics',
          iconPath: ICONS.chart
        })
      ])
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Management'),
      el('nav', { class: 'sidebar-nav' }, [
        navLink({ label: 'Security Keys', iconPath: ICONS.key }),
        navLink({ label: 'Settings', iconPath: ICONS.settings })
      ])
    ])
  ]);

  return sidebar;
}
