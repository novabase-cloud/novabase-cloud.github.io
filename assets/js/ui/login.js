import { el, icon, clear, mount } from '../utils/dom.js';
import { initiateLogin } from '../utils/oauth.js';

const ICONS = {
  huggingface: '<path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>', // Note: Simplified icon path, ideally use a better HF logo
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

