import { el, icon, clear, mount } from '../utils/dom.js';
import { navigate, parseHash } from '../router.js';
import { store } from '../store.js';
import { updateSettings, getSettings, addCustomRepo, removeCustomRepo, getCustomRepos } from '../settings.js';

const ICONS = {
  folder: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>'
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

function buildRepoLink(id, type, isActive, onRemove, onEdit) {
  const editBtn = onEdit ? el('button', {
    type: 'button',
    class: 'sidebar-repo-edit',
    'aria-label': `Edit ${id}`,
    title: 'Edit repo name',
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      onEdit(id, type);
    }
  }, [icon(ICONS.edit, 12)]) : null;

  const removeBtn = onRemove ? el('button', {
    type: 'button',
    class: 'sidebar-repo-remove',
    'aria-label': `Remove ${id}`,
    title: 'Remove from list',
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove(id);
    }
  }, [icon(ICONS.x, 12)]) : null;

  const actionsEl = (editBtn || removeBtn) ? el('span', { class: 'sidebar-repo-btn-group' }, [editBtn, removeBtn].filter(Boolean)) : null;

  const link = el('a', {
    href: '#',
    class: `sidebar-link${isActive ? ' is-active' : ''}`,
    'data-repo': id,
    onClick: (e) => {
      e.preventDefault();
      updateSettings({ lastRepo: id, lastRepoType: type || 'dataset' });
      navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: id, repo_type: type || 'dataset' });
      closeForm();
    }
  }, [
    icon(ICONS.folder, 18),
    el('span', { class: 'sidebar-repo-label' }, [id]),
    actionsEl
  ].filter(Boolean));

  return link;
}

function buildSidebar() {
  const goRoot = () => {
    navigate({ path: '_storage', search: '', extension: '', sort: '', page: 1, repo: null, repo_type: null });
  };
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

  // --- Repo links container ---
  const repoListEl = el('nav', { class: 'sidebar-nav sidebar-repo-list' });

  function rebuildRepoList() {
    const currentRepo = store.state.repo?.id || getSettings().lastRepo || null;
    const currentType = store.state.repo?.type || getSettings().lastRepoType || 'dataset';
    const customRepos = getCustomRepos();
    const myRepos = store.state.repos || [];

    const sections = [];

    if (myRepos.length > 0) {
      sections.push(el('p', { class: 'sidebar-section-title', style: { marginTop: '12px' } }, 'My Repositories'));
      myRepos.forEach(r => {
        sections.push(buildRepoLink(r.id, r.type, currentRepo === r.id, null, null));
      });
    }

    if (customRepos.length > 0) {
      sections.push(el('p', { class: 'sidebar-section-title', style: { marginTop: '12px' } }, 'Added Repositories'));
      customRepos.forEach(r => {
        sections.push(buildRepoLink(r.id, r.type, currentRepo === r.id, (id) => {
          removeCustomRepo(id);
          if (store.state.repo?.id === id) {
            const nextRepo = customRepos.find(r => r.id !== id) || myRepos[0] || null;
            if (nextRepo) {
              updateSettings({ lastRepo: nextRepo.id, lastRepoType: nextRepo.type });
              navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: nextRepo.id, repo_type: nextRepo.type });
            } else {
              updateSettings({ lastRepo: null, lastRepoType: 'dataset' });
              navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: null, repo_type: 'dataset' });
            }
          }
          rebuildRepoList();
        }, (id, type) => {
          openEditForm(id, type);
        }));
      });
    }

    clear(repoListEl);
    for (const node of sections) {
      repoListEl.appendChild(node);
    }
  }

  store.subscribe(() => { rebuildRepoList(); });

  // --- Add / Edit repo form ---
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

  let isEditing = false;
  let editRepoId = null;

  function openForm() {
    isEditing = false;
    editRepoId = null;
    repoInput.value = '';
    typeSelect.value = 'dataset';
    removeBtn.style.display = 'none';
    saveBtn.textContent = 'Save';
    repoForm.style.display = '';
    repoInput.focus();
  }

  function openEditForm(id, type) {
    isEditing = true;
    editRepoId = id;
    repoInput.value = id;
    typeSelect.value = type || 'dataset';
    removeBtn.style.display = '';
    saveBtn.textContent = 'Update';
    repoForm.style.display = '';
    repoInput.focus();
  }

  function closeForm() {
    repoForm.style.display = 'none';
    repoInput.value = '';
    isEditing = false;
    editRepoId = null;
  }

  saveBtn.addEventListener('click', () => {
    const val = repoInput.value.trim();
    if (!val) return;
    const id = val.replace(/^https?:\/\//, '').replace(/\/resolve\/main.*/, '').replace(/\/tree\/main.*/, '').replace(/\/blob\/main.*/, '').trim();
    if (!id) return;

    if (isEditing && editRepoId && editRepoId !== id) {
      removeCustomRepo(editRepoId);
    }
    addCustomRepo(id, typeSelect.value);
    updateSettings({ lastRepo: id, lastRepoType: typeSelect.value });
    navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: id, repo_type: typeSelect.value });
    closeForm();
  });

  cancelBtn.addEventListener('click', closeForm);

  removeBtn.addEventListener('click', () => {
    if (editRepoId) {
      removeCustomRepo(editRepoId);
      if (store.state.repo?.id === editRepoId) {
        const customRepos = getCustomRepos().filter(r => r.id !== editRepoId);
        const nextRepo = customRepos[0] || null;
        if (nextRepo) {
          updateSettings({ lastRepo: nextRepo.id, lastRepoType: nextRepo.type });
          navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: nextRepo.id, repo_type: nextRepo.type });
        } else {
          updateSettings({ lastRepo: null, lastRepoType: 'dataset' });
          navigate({ path: '', search: '', extension: '', sort: '', page: 1, repo: null, repo_type: 'dataset' });
        }
      }
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

  const sidebar = el('aside', { class: 'app-sidebar', id: 'app-sidebar' }, [
    el('div', { class: 'sidebar-header-mobile' }, [
      el('span', { class: 'sidebar-header-mobile-title' }, 'Menu'),
      el('button', { type: 'button', class: 'app-icon-button', 'aria-label': 'Close menu', onClick: closeSidebar }, [icon(ICONS.close, 18)])
    ]),
    el('div', { class: 'sidebar-section' }, [
      el('p', { class: 'sidebar-section-title' }, 'Repository'),
      repoListEl,
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
