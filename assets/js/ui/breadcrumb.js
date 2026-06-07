import { el, icon } from '../utils/dom.js';
import { navigate } from '../router.js';

const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>'
};

function navigateToPath(target) {
  navigate({ path: target, search: '', extension: '', sort: '', page: 1 });
}

export function renderBreadcrumb(path) {
  const parts = (path || '').split('/').filter(Boolean);

  const items = [
    el(
      'a',
      {
        href: '#/',
        class: 'breadcrumb-item',
        onClick: (e) => {
          e.preventDefault();
          navigateToPath('');
        }
      },
      [icon(ICONS.home, 14), el('span', {}, 'root')]
    ),
    ...parts.map((part, idx) => {
      const subPath = parts.slice(0, idx + 1).join('/');
      const isLast = idx === parts.length - 1;
      return el(
        'span',
        { class: 'breadcrumb-item' + (isLast ? ' is-current' : '') },
        isLast
          ? [el('span', {}, part)]
          : [
              el('a', {
                href: `#/${subPath}`,
                onClick: (e) => {
                  e.preventDefault();
                  navigateToPath(subPath);
                }
              }, part)
            ]
      );
    })
  ];

  const frag = document.createDocumentFragment();
  items.forEach((item, idx) => {
    frag.appendChild(item);
    if (idx < items.length - 1) {
      frag.appendChild(el('span', { class: 'breadcrumb-separator' }, '/'));
    }
  });

  return el('div', { class: 'breadcrumb' }, frag);
}
