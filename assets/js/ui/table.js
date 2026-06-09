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
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>'
};

function iconForItem(item) {
  if (item.type === 'directory') return icon(ICONS.folder, 18);
  const key = getFileKey(item.name);
  if (FILE_TYPES.VIDEO.includes(key)) return icon(ICONS.video, 18);
  if (FILE_TYPES.AUDIO?.includes(key)) return icon(ICONS.volume, 18);
  if (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') return icon(ICONS.image, 18);
  if (FILE_TYPES.JSON.includes(key)) return icon(ICONS.json, 18);
  if (['csv', 'tsv'].includes(key)) return icon(ICONS.csv, 18);
  if (['md', 'markdown', 'rst', 'adoc'].includes(key)) return icon(ICONS.doc, 18);
  if (FILE_TYPES.TEXT.includes(key)) return icon(ICONS.code, 18);
  return icon(ICONS.file, 18);
}

function badgeForItem(item) {
  if (item.type === 'directory') {
    return el('span', { class: 'badge badge-folder' }, 'folder');
  }
  const key = getFileKey(item.name);
  const cls = FILE_TYPES.VIDEO.includes(key)
    ? 'badge-mp4'
    : FILE_TYPES.AUDIO?.includes(key)
    ? 'badge-audio'
    : FILE_TYPES.JSON.includes(key)
    ? 'badge-json'
    : ['csv', 'tsv'].includes(key)
    ? 'badge-csv'
    : key === 'parquet'
    ? 'badge-parquet'
    : FILE_TYPES.TEXT.includes(key)
    ? 'badge-text'
    : 'badge-file';
  return el('span', { class: `badge ${cls}` }, key || 'file');
}

function navigateToFolder(fullPath) {
  navigate({ path: fullPath, search: '', extension: '', sort: '', page: 1 });
}

function renderRow(item) {
  const isFolder = item.type === 'directory';
  const key = getFileKey(item.name);
  const previewable =
    !isFolder &&
    (FILE_TYPES.VIDEO.includes(key) ||
     FILE_TYPES.AUDIO?.includes(key) ||
      (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') ||
      FILE_TYPES.JSON.includes(key) ||
      FILE_TYPES.CSV.includes(key) ||
      FILE_TYPES.TEXT.includes(key));

  const nameContent = isFolder
    ? el(
        'a',
        {
          href: `#/${item.full_path}`,
          class: 'name-link',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToFolder(item.full_path);
          }
        },
        [iconForItem(item), el('span', {}, item.name)]
      )
    : el('div', { class: 'name-link name-link-file' }, [iconForItem(item), el('span', {}, item.name)]);

  const nameCell = el(
    'td',
    { class: isFolder ? 'cell-name is-folder' : 'cell-name is-file' },
    [nameContent]
  );

  const typeCell = el('td', {}, [badgeForItem(item)]);

  const sizeCell = el(
    'td',
    { class: 'text-xs', style: { color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' } },
    isFolder ? '--' : formatBytes(item.size)
  );

  const actionCell = el('td', { class: 'cell-actions' });
  if (isFolder) {
    actionCell.appendChild(
      el(
        'a',
        {
          href: `#/${item.full_path}`,
          class: 'btn btn-secondary',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToFolder(item.full_path);
          }
        },
        'Open'
      )
    );
  } else {
    if (previewable) {
      const previewBtn = el(
        'button',
        {
          class: 'btn btn-secondary',
          onClick: (e) => {
            e.stopPropagation();
            openPreview({ path: item.full_path, name: item.name });
          }
        },
        'Preview'
      );
      actionCell.appendChild(previewBtn);
    }
      if (item.download_url) {
        const label = FILE_TYPES.VIDEO.includes(key) ? 'Stream' : FILE_TYPES.AUDIO?.includes(key) ? 'Play' : 'Download';
        const dlBtn = el(
          'a',
          {
            href: item.download_url,
            class: 'btn btn-primary',
            target: '_blank',
            rel: 'noopener noreferrer',
            download: item.name,
            onClick: (e) => e.stopPropagation()
          },
          label
        );
      actionCell.appendChild(document.createTextNode(' '));
      actionCell.appendChild(dlBtn);
    }
  }

  const tr = el(
    'tr',
    {
      class: isFolder ? 'is-clickable' : '',
      onClick: () => {
        if (isFolder) navigateToFolder(item.full_path);
      },
      role: isFolder ? 'link' : 'row',
      tabindex: isFolder ? '0' : '-1',
      onKeydown: (e) => {
        if (!isFolder) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToFolder(item.full_path);
        }
      }
    },
    [nameCell, typeCell, sizeCell, actionCell]
  );

  return tr;
}

function renderParentRow(currentPath) {
  if (!currentPath) return null;
  const parent = getParentPath(currentPath);
  return el(
    'tr',
    {
      class: 'is-clickable',
      onClick: () => navigateToFolder(parent),
      role: 'link',
      tabindex: '0',
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToFolder(parent);
        }
      }
    },
    [
      el('td', { class: 'cell-name is-folder' }, [
        el(
          'a',
          {
            href: `#/${parent}`,
            class: 'name-link',
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateToFolder(parent);
            }
          },
          [el('span', { class: 'parent-ellipsis' }, '..'), el('span', {}, 'Go to parent directory')]
        )
      ]),
      el('td', { class: 'text-xs', style: { color: 'var(--color-text-subtle)' } }, '-'),
      el('td', { class: 'text-xs', style: { color: 'var(--color-text-subtle)' } }, '-'),
      el('td', { class: 'cell-actions' })
    ]
  );
}

function applyHiddenFilter(items) {
  const show = getSettings().showHidden;
  if (show) return items;
  return items.filter((it) => !it.name.startsWith('.'));
}

export function renderTable({ items, path, loading, error }) {
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

  const tbody = el('tbody', {});
  const parentRow = renderParentRow(path);
  if (parentRow) tbody.appendChild(parentRow);
  for (const item of filtered) {
    tbody.appendChild(renderRow(item));
  }

  return el('div', { class: 'data-card' }, [
    el('div', { class: 'data-table-wrap' }, [
      el('table', { class: 'data-table' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { style: { width: '50%' } }, 'Name'),
            el('th', { style: { width: '16%' } }, 'Type'),
            el('th', { style: { width: '16%' } }, 'Size'),
            el('th', { class: 'text-right', style: { width: '18%' } }, 'Actions')
          ])
        ]),
        tbody
      ])
    ])
  ]);
}
