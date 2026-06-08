import { el, icon } from '../utils/dom.js';
import { navigate, parseHash } from '../router.js';
import { store } from '../store.js';
import { DEFAULT_REPO } from '../config.js';
import { updateSettings, getSettings, addCustomRepo, removeCustomRepo, getCustomRepos } from '../settings.js';

const ICONS = {
  folder: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
};

function isSettingsActive() {
  return parseHash().path === 'settings';
}

function isDashboardActive() {
  return parseHash().path !== 'settings';
}

function navLink({ label, iconPath, isActive, onClick }) {
  return el('a', {
    href: '#',
    class: `sidebar-link${isActive ? ' is-active' : ''}`,
    'data-nav': label,
    onClick: (e) => {
      e.preventDefault();
      if (onClick) onClick();
    }
  }, [icon(iconPath, 18), el('span', {}, label)]);
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
  const settingsLink = navLink({
    label: 'Settings',
    iconPath: ICONS.settings,
    isActive: isSettingsActive(),
    onClick: goSettings
  });

  const repoSelect = el('select', { class: 'sidebar-repo-select', 'aria-label': 'Select repository' });

  function buildOpt(id, type, label) {
    const opt = el('option', { value: `${id}:${type}` }, label || `${id} (${type})`);
    return opt;
  }

  function refreshRepoOptions() {
    const currentRepo = store.state.repo?.id || getSettings().lastRepo || DEFAULT_REPO.id;
    const currentType = store.state.repo?.type || getSettings().lastRepoType || DEFAULT_REPO.type;
    const customRepos = getCustomRepos();

    repoSelect.innerHTML = '';
    repoSelect.appendChild(buildOpt(DEFAULT_REPO.id, DEFAULT_REPO.type, DEFAULT_REPO.label));

    for (const r of customRepos) {
      repoSelect.appendChild(buildOpt(r.id, r.type));
    }

    const matchVal = `${currentRepo}:${currentType}`;
    if (Array.from(repoSelect.options).some((o) => o.value === matchVal)) {
      repoSelect.value = matchVal;
    } else {
      repoSelect.value = `${DEFAULT_REPO.id}:${DEFAULT_REPO.type}`;
    }
  }

  repoSelect.addEventListener('change', () => {
    const val = repoSelect.value;
    const [id, type] = val.split(':');
    if (id) {
      updateSettings({ lastRepo: id, lastRepoType: type || 'dataset' });
      navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: id, repo_type: type || 'dataset' });
      closeForm();
    }
  });

  // --- Add repo form ---
  const repoForm = el('div', { class: 'sidebar-repo-form', style: { display: 'none' } });

  const repoInput = el('input', {
    type: 'text',
    class: 'sidebar-repo-input',
    placeholder: 'User/RepoName',
    autocomplete: 'off',
    spellcheck: 'false'
  });

  const typeSelect = el('select', { class: 'sidebar-repo-type' }, [
    el('option', { value: 'dataset' }, 'dataset'),
    el('option', { value: 'model' }, 'model')
  ]);

  const saveBtn = el('button', { type: 'button', class: 'sidebar-repo-btn sidebar-repo-btn-save' }, 'Save');
  const cancelBtn = el('button', { type: 'button', class: 'sidebar-repo-btn sidebar-repo-btn-cancel' }, 'Cancel');
  const removeBtn = el('button', { type: 'button', class: 'sidebar-repo-btn sidebar-repo-btn-remove', style: { display: 'none' } }, 'Remove');

  const formBtns = el('div', { class: 'sidebar-repo-form-btns' }, [saveBtn, cancelBtn, removeBtn]);
  repoForm.appendChild(repoInput);
  repoForm.appendChild(typeSelect);
  repoForm.appendChild(formBtns);

  function openForm(editId) {
    if (editId) {
      repoInput.value = editId;
      repoInput.dataset.editId = editId;
      removeBtn.style.display = '';
      saveBtn.textContent = 'Update';
    } else {
      repoInput.value = '';
      delete repoInput.dataset.editId;
      removeBtn.style.display = 'none';
      saveBtn.textContent = 'Save';
    }
    repoForm.style.display = '';
    repoInput.focus();
  }

  function closeForm() {
    repoForm.style.display = 'none';
    repoInput.value = '';
    delete repoInput.dataset.editId;
  }

  saveBtn.addEventListener('click', () => {
    const val = repoInput.value.trim();
    if (!val) return;
    const id = val.replace(/^https?:\/\//, '').replace(/\/resolve\/main.*/, '').replace(/\/tree\/main.*/, '').trim();
    if (!id) return;
    const editId = repoInput.dataset.editId;
    if (editId && editId !== id) {
      removeCustomRepo(editId);
    }
    addCustomRepo(id, typeSelect.value);
    refreshRepoOptions();
    updateSettings({ lastRepo: id, lastRepoType: typeSelect.value });
    navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: id, repo_type: typeSelect.value });
    closeForm();
  });

  cancelBtn.addEventListener('click', closeForm);

  removeBtn.addEventListener('click', () => {
    const id = repoInput.dataset.editId;
    if (id) {
      removeCustomRepo(id);
      if (store.state.repo?.id === id) {
        updateSettings({ lastRepo: DEFAULT_REPO.id, lastRepoType: DEFAULT_REPO.type });
        navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: DEFAULT_REPO.id, repo_type: DEFAULT_REPO.type });
      }
      refreshRepoOptions();
      closeForm();
    }
  });

  repoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelBtn.click(); }
  });

  const addRepoBtn = el('button', {
    type: 'button',
    class: 'sidebar-add-repo-btn',
    onClick: () => {
      if (repoForm.style.display === 'none') {
        openForm();
      } else {
        closeForm();
      }
    }
  }, [icon(ICONS.plus, 14), el('span', {}, 'Add repo')]);

  store.subscribe(() => { refreshRepoOptions(); });

  const sidebar = el('aside', { class: 'app-sidebar', id: 'app-sidebar' }, [
    el('div', { class: 'sidebar-header-mobile' }, [
      el('span', { class: 'sidebar-header-mobile-title' }, 'Menu'),
      el('button', { type: 'button', class: 'app-icon-button', 'aria-label': 'Close menu', onClick: closeSidebar }, [icon(ICONS.close, 18)])
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Repository'),
      el('div', { class: 'sidebar-repo-wrap' }, [repoSelect]),
      el('div', { class: 'sidebar-repo-actions' }, [addRepoBtn, repoForm])
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Data products'),
      el('nav', { class: 'sidebar-nav' }, [storageLink])
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Management'),
      el('nav', { class: 'sidebar-nav' }, [settingsLink])
    ])
  ]);

  return { sidebar, storageLink, settingsLink };
}

let _storageLink = null;
let _settingsLink = null;

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
