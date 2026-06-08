import { el, icon } from '../utils/dom.js';
import { formatBytes, getFileKey, getParentPath } from '../utils/format.js';
import { navigate } from '../router.js';
import { openPreview } from './preview.js';
import { FILE_TYPES } from '../config.js';
import { getSettings } from '../settings.js';

const ICONS = {
  folder: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>',
  video: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
  code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  json: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  csv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>',
  play: '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
  search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
};

let observer = null;

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const src = el.dataset.src;
          if (src) {
            if (el.tagName === 'IMG') {
              el.src = src;
            } else if (el.tagName === 'VIDEO') {
              el.src = src;
              el.load();
            }
            el.removeAttribute('data-src');
          }
          observer.unobserve(el);
        }
      }
    }, { rootMargin: '200px' });
  }
  return observer;
}

function iconForItem(item) {
  if (item.type === 'directory') return icon(ICONS.folder, 32);
  const key = getFileKey(item.name);
  if (FILE_TYPES.VIDEO.includes(key)) return icon(ICONS.video, 32);
  if (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') return icon(ICONS.image, 32);
  if (FILE_TYPES.JSON.includes(key)) return icon(ICONS.json, 32);
  if (['csv', 'tsv'].includes(key)) return icon(ICONS.csv, 32);
  if (['md', 'markdown', 'rst', 'adoc'].includes(key)) return icon(ICONS.doc, 32);
  if (FILE_TYPES.TEXT.includes(key)) return icon(ICONS.code, 32);
  return icon(ICONS.file, 32);
}

function badgeForItem(item) {
  if (item.type === 'directory') {
    return el('span', { class: 'badge badge-folder' }, 'folder');
  }
  const key = getFileKey(item.name);
  const cls = FILE_TYPES.VIDEO.includes(key) ? 'badge-mp4'
    : FILE_TYPES.JSON.includes(key) ? 'badge-json'
    : ['csv', 'tsv'].includes(key) ? 'badge-csv'
    : key === 'parquet' ? 'badge-parquet'
    : FILE_TYPES.TEXT.includes(key) ? 'badge-text'
    : 'badge-file';
  return el('span', { class: `badge ${cls}` }, key || 'file');
}

function renderCard(item, isParent) {
  const isFolder = item.type === 'directory';
  const key = getFileKey(item.name);
  const previewable =
    !isFolder &&
    (FILE_TYPES.VIDEO.includes(key) ||
     (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') ||
     FILE_TYPES.JSON.includes(key) ||
     FILE_TYPES.CSV.includes(key) ||
     FILE_TYPES.TEXT.includes(key));

  let thumb;
  if (isParent) {
    thumb = el('div', { class: 'card-thumb' }, [
      el('span', { class: 'card-thumb-icon card-thumb-icon-parent' }, '..')
    ]);
  } else if (isFolder) {
    thumb = el('div', { class: 'card-thumb card-thumb-folder' }, [
      el('span', { class: 'card-folder-icon' }, [icon(ICONS.folder, 36)])
    ]);
  } else if (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') {
    const img = el('img', {
      class: 'card-thumb-img',
      alt: item.name,
      'data-src': item.download_url,
      onError: function() {
        this.style.display = 'none';
        const next = this.nextElementSibling;
        if (next) next.style.display = 'flex';
      }
    });
    getObserver().observe(img);
    thumb = el('div', { class: 'card-thumb card-thumb-media' }, [
      img,
      el('span', { class: 'card-thumb-fallback', style: { display: 'none' } }, [icon(ICONS.image, 28)])
    ]);
  } else if (FILE_TYPES.VIDEO.includes(key)) {
    const video = el('video', {
      class: 'card-thumb-video',
      'data-src': item.download_url,
      preload: 'none',
      muted: true,
      playsinline: true,
      onError: function() {
        this.style.display = 'none';
        const next = this.nextElementSibling;
        if (next) next.style.display = 'flex';
      }
    });
    getObserver().observe(video);
    thumb = el('div', { class: 'card-thumb card-thumb-media' }, [
      video,
      el('span', { class: 'card-thumb-play' }, [icon(ICONS.play, 20)]),
      el('span', { class: 'card-thumb-fallback', style: { display: 'none' } }, [icon(ICONS.video, 28)])
    ]);
  } else {
    thumb = el('div', { class: 'card-thumb' }, [
      el('span', { class: 'card-thumb-icon' }, [iconForItem(item)])
    ]);
  }

  const handleClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isParent) {
      navigate({ path: item.full_path, search: '', extension: '', sort: '', page: 1 });
    } else if (isFolder) {
      navigate({ path: item.full_path, search: '', extension: '', sort: '', page: 1 });
    } else if (previewable) {
      openPreview({ path: item.full_path, name: item.name });
    }
  };

  const actionBtns = el('div', { class: 'card-actions' });
  if (!isParent) {
    if (isFolder) {
      actionBtns.appendChild(el('a', {
        href: `#/${item.full_path}`,
        class: 'btn btn-secondary btn-sm',
        onClick: (e) => { e.preventDefault(); e.stopPropagation(); handleClick(e); }
      }, 'Open'));
    } else {
      if (previewable) {
        actionBtns.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-secondary btn-sm',
          onClick: (e) => { e.stopPropagation(); openPreview({ path: item.full_path, name: item.name }); }
        }, 'Preview'));
      }
      if (item.download_url) {
        const label = FILE_TYPES.VIDEO.includes(key) ? 'Stream' : 'Download';
        actionBtns.appendChild(el('a', {
          href: item.download_url,
          class: 'btn btn-primary btn-sm',
          target: '_blank',
          rel: 'noopener noreferrer',
          download: isFolder ? undefined : item.name,
          onClick: (e) => e.stopPropagation()
        }, label));
      }
    }
  }

  const nameEl = el('div', { class: 'card-name' }, [
    el('span', { class: 'card-name-text' }, isParent ? '.. (parent)' : item.name)
  ]);

  const metaEl = el('div', { class: 'card-meta' }, [
    badgeForItem(item),
    isFolder ? null : el('span', { class: 'card-size' }, formatBytes(item.size))
  ].filter(Boolean));

  return el('div', {
    class: `file-card${isFolder && !isParent ? ' is-folder' : ''}${isParent ? ' is-parent' : ''}`,
    tabindex: '0',
    role: 'button',
    onClick: handleClick,
    onKeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e);
      }
    }
  }, [thumb, nameEl, metaEl, actionBtns]);
}

function applyHiddenFilter(items) {
  const show = getSettings().showHidden;
  if (show) return items;
  return items.filter((it) => !it.name.startsWith('.'));
}

export function renderGrid({ items, path, loading, error }) {
  if (loading) {
    return el('div', { class: 'data-card' }, [
      el('div', { class: 'loading-state' }, [el('span', { class: 'spinner' }), el('span', {}, 'Loading data...')])
    ]);
  }

  if (error) {
    return el('div', { class: 'data-card' }, [
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, [icon(ICONS.file, 32)]),
        el('p', {}, 'Unable to load data.')
      ])
    ]);
  }

  const filtered = applyHiddenFilter(items || []);
  if (!filtered || filtered.length === 0) {
    return el('div', { class: 'data-card' }, [
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, [icon(ICONS.folder, 32)]),
        el('p', {}, 'This folder is empty.')
      ])
    ]);
  }

  const cards = [];
  if (path) {
    const parentPath = getParentPath(path);
    cards.push(renderCard({ name: '..', full_path: parentPath, type: 'directory' }, true));
  }
  for (const item of filtered) {
    cards.push(renderCard(item, false));
  }

  const filterInput = el('input', {
    type: 'text',
    class: 'grid-filter-input',
    placeholder: 'Filter cards...',
    'aria-label': 'Filter grid cards',
    autocomplete: 'off',
    spellcheck: 'false',
    onInput: function() {
      const q = this.value.toLowerCase().trim();
      const container = this.closest('.file-grid-wrap');
      if (!container) return;
      const allCards = container.querySelectorAll('.file-card');
      for (const card of allCards) {
        const nameEl = card.querySelector('.card-name-text');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        card.style.display = (!q || name.includes(q)) ? '' : 'none';
      }
    }
  });

  const filterWrap = el('div', { class: 'grid-filter' }, [
    el('span', { class: 'grid-filter-icon' }, [icon(ICONS.search, 14)]),
    filterInput
  ]);

  const itemCount = filtered.length;

  return el('div', { class: 'file-grid-wrap' }, [
    filterWrap,
    el('div', { class: 'file-grid' }, cards),
    el('div', { class: 'grid-footer' }, [
      el('span', {}, `${itemCount} item${itemCount !== 1 ? 's' : ''}`)
    ])
  ]);
}
