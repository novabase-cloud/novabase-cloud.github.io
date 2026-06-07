import { el, icon } from '../utils/dom.js';

const ICONS = {
  success: '<polyline points="20 6 9 17 4 12"></polyline>',
  error: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
  info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
};

function ensureStack() {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = el('div', { class: 'toast-stack', id: 'toast-stack' });
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast({ kind = 'info', message = '', timeout = 2400 }) {
  const stack = ensureStack();
  const toast = el(
    'div',
    { class: `toast toast-${kind}` },
    [el('span', { class: 'toast-icon' }, [icon(ICONS[kind] || ICONS.info, 18)]), el('span', {}, message)]
  );
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }, timeout);
}
