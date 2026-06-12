import { el, icon, clear, mount } from '../utils/dom.js';
import { initiateLogin } from '../utils/oauth.js';

const ICONS = {
  huggingface: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>'
};

let onSuccessCallback = null;

export function initLogin(onSuccess) {
  onSuccessCallback = onSuccess;
}

function buildScreen() {
  const loginBtn = el(
    'button',
    {
      type: 'button',
      class: 'login-hf-btn',
      onClick: async () => {
        setLoading(loginBtn, true);
        try {
          await initiateLogin();
        } catch (err) {
          console.error('OAuth initiation failed', err);
          alert('Failed to initiate login. Please check your console.');
          setLoading(loginBtn, false);
        }
      }
    },
    [
      el('span', { class: 'login-hf-icon' }, [icon(ICONS.huggingface, 20)]),
      el('span', { class: 'login-hf-label' }, 'Login with Hugging Face'),
      el('span', { class: 'login-hf-spinner', style: { display: 'none' } }, [
        el('span', { class: 'spinner' })
      ])
    ]
  );

  const card = el('div', { class: 'login-card' }, [
    el('div', { class: 'login-brand' }, [
      el('div', { class: 'login-brand-icon' }, [icon(ICONS.huggingface, 24)]),
      el('div', { class: 'login-brand-text' }, [
        el('h1', {}, 'Novabase Hub'),
        el('p', {}, 'Storage Gateway')
      ])
    ]),
    el('h2', { class: 'login-title' }, 'Welcome Back'),
    el('p', { class: 'login-subtitle' }, 'Sign in with your Hugging Face account to manage your datasets and models.'),
    
    el('div', { class: 'login-actions' }, [
      loginBtn
    ]),

    el('div', { class: 'login-info' }, [
      el('p', {}, 'This app uses PKCE (Proof Key for Code Exchange) for secure authentication. No server-side secrets are used.'),
      el('a', { 
        href: 'https://huggingface.co/docs/hub/oauth', 
        target: '_blank', 
        class: 'login-link' 
      }, [
        'Learn about HF OAuth',
        icon(ICONS.external, 12)
      ])
    ]),

    el('div', { class: 'login-footer' }, 'Powered by Cloudflare Workers · v2.0.0 (OAuth)')
  ]);

  const screen = el('div', { class: 'login-screen', id: 'login-screen' }, [card]);

  return { screen, loginBtn };
}

function setLoading(btn, isLoading) {
  const label = btn.querySelector('.login-hf-label');
  const spinner = btn.querySelector('.login-hf-spinner');
  btn.disabled = isLoading;
  if (label) label.style.opacity = isLoading ? '0.5' : '1';
  if (spinner) spinner.style.display = isLoading ? 'inline-flex' : 'none';
}

export function renderLogin(container) {
  clear(container);
  const { screen, loginBtn } = buildScreen();
  mount(container, screen);
  
  // Check if we just returned from a successful OAuth flow
  if (window.location.search.includes('code=') || window.location.hash.includes('code=')) {
     setLoading(loginBtn, true);
  }

  return { screen };
}

