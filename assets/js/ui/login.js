import { el, icon, clear, mount } from '../utils/dom.js';
import { login, isRememberEnabled } from '../auth.js';

const ICONS = {
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
};

let onSuccessCallback = null;

export function initLogin(onSuccess) {
  onSuccessCallback = onSuccess;
}

function buildScreen() {
  const passwordInput = el('input', {
    type: 'password',
    class: 'login-input',
    id: 'login-password',
    placeholder: 'Enter access key',
    autocomplete: 'current-password',
    spellcheck: 'false',
    'aria-label': 'Access key'
  });

  const rememberInput = el('input', {
    type: 'checkbox',
    id: 'login-remember',
    checked: isRememberEnabled()
  });

  const submitBtn = el(
    'button',
    {
      type: 'submit',
      class: 'login-submit'
    },
    [
      el('span', { class: 'login-submit-label' }, 'Open Dashboard'),
      el('span', { class: 'login-submit-spinner', style: { display: 'none' } }, [
        el('span', { class: 'spinner' })
      ])
    ]
  );

  const toggleBtn = el(
    'button',
    {
      type: 'button',
      class: 'login-toggle-visibility',
      'aria-label': 'Toggle password visibility',
      onClick: () => toggleVisibility(passwordInput, toggleBtn)
    },
    [icon(ICONS.eye, 16)]
  );

  const form = el(
    'form',
    {
      class: 'login-form',
      autocomplete: 'on',
      novalidate: true,
      onSubmit: async (event) => {
        event.preventDefault();
        await handleSubmit(passwordInput, rememberInput, submitBtn);
      }
    },
    [
      el('div', { class: 'login-field' }, [
        el('label', { class: 'login-label', for: 'login-password' }, 'Access Key'),
        el('div', { class: 'login-input-wrap' }, [
          el('span', { class: 'login-input-icon' }, [icon(ICONS.lock, 16)]),
          passwordInput,
          toggleBtn
        ])
      ]),
      el('div', { class: 'login-options' }, [
        el('label', { class: 'login-remember' }, [
          rememberInput,
          el('span', {}, 'Remember me on this device')
        ])
      ]),
      submitBtn
    ]
  );

  const card = el('div', { class: 'login-card' }, [
    el('div', { class: 'login-brand' }, [
      el('div', { class: 'login-brand-icon' }, [icon(ICONS.lock, 20)]),
      el('div', { class: 'login-brand-text' }, [
        el('h1', {}, 'Novabase Hub'),
        el('p', {}, 'Storage Gateway')
      ])
    ]),
    el('h2', { class: 'login-title' }, 'Sign in to Storage API'),
    el('p', { class: 'login-subtitle' }, 'Enter your access key to open the Cloudflare Workers API gateway.'),
    form,
    el('div', { class: 'login-footer' }, 'Powered by Cloudflare Workers · v1.0.0')
  ]);

  const screen = el('div', { class: 'login-screen', id: 'login-screen' }, [card]);

  return { screen, passwordInput };
}

async function handleSubmit(passwordInput, rememberInput, submitBtn) {
  const password = passwordInput.value;
  if (!password) {
    return;
  }

  setLoading(submitBtn, true);

  try {
    const ok = await login(password, { remember: rememberInput.checked });
    if (ok) {
      passwordInput.value = '';
      if (typeof onSuccessCallback === 'function') {
        onSuccessCallback();
      }
    } else {
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    console.error('[login.js] submit error', err);
  } finally {
    setLoading(submitBtn, false);
  }
}

function setLoading(btn, isLoading) {
  const label = btn.querySelector('.login-submit-label');
  const spinner = btn.querySelector('.login-submit-spinner');
  btn.disabled = isLoading;
  if (label) label.style.display = isLoading ? 'none' : '';
  if (spinner) spinner.style.display = isLoading ? 'inline-flex' : 'none';
}

function toggleVisibility(input, btn) {
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = '';
  btn.appendChild(icon(isPassword ? ICONS.eyeOff : ICONS.eye, 16));
}

export function renderLogin(container) {
  clear(container);
  const { screen, passwordInput } = buildScreen();
  mount(container, screen);
  setTimeout(() => passwordInput.focus(), 50);
  return { screen, passwordInput };
}
