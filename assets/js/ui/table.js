import { el, icon } from '../utils/dom.js';
import { formatBytes, getFileKey, getParentPath } from '../utils/format.js';
import { navigate } from '../router.js';
import { openPreview } from './preview.js';
import { FILE_TYPES } from '../config.js';

const ICONS = {
  folder: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>',
  video: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
  code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  json: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  csv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>'
};

function iconForItem(item) {
  if (item.type === 'directory') return icon(ICONS.folder, 18);
  const key = getFileKey(item.name);
  if (FILE_TYPES.VIDEO.includes(key)) return icon(ICONS.video, 18);
  if (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') return icon(ICONS.image, 18);
  if (FILE_TYPES.JSON.includes(key)) return icon(ICONS.json, 18);
  if (['csv', 'tsv'].includes(key)) return icon(ICONS.csv, 18);
  if (['md', 'markdown', 'rst', 'adoc'].includes(key)) return icon(ICONS.doc, 18);
  if (FILE_TYPES.TEXT.includes(key)) return icon(ICONS.code, 18);
  return icon(ICONS.file, 18);
}

function badgeForItem(item) {
  if (item.type === 'directory') {
    return el('span', { class: 'badge badge-folder' }, 'directory');
  }
  const key = getFileKey(item.name);
  const cls = FILE_TYPES.VIDEO.includes(key)
    ? 'badge-mp4'
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

function renderRow(item, currentPath) {
  const isFolder = item.type === 'directory';
  const key = getFileKey(item.name);
  const previewable =
    !isFolder &&
    (FILE_TYPES.VIDEO.includes(key) ||
      (FILE_TYPES.IMAGE.includes(key) && key !== 'svg') ||
      FILE_TYPES.JSON.includes(key) ||
      FILE_TYPES.CSV.includes(key) ||
      FILE_TYPES.TEXT.includes(key));

  const nameCell = isFolder
    ? el('td', { class: 'cell-name is-folder' }, [
        el(
          'a',
          {
            href: `#/${item.full_path}`,
            class: 'name-link',
            onClick: (e) => {
              e.preventDefault();
              navigate({
                path: item.full_path,
                search: '',
                extension: '',
                sort: '',
                page: 1
              });
            }
          },
          [iconForItem(item), el('span', {}, item.name)]
        )
      ])
    : el('td', { class: 'cell-name is-file' }, [iconForItem(item), el('span', {}, item.name)]);

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
            navigate({ path: item.full_path, search: '', extension: '', sort: '', page: 1 });
          }
        },
        'Buka'
      )
    );
  } else {
    if (previewable) {
      const previewBtn = el(
        'button',
        {
          class: 'btn btn-secondary',
          onClick: () => openPreview({ path: item.full_path, name: item.name })
        },
        'Preview'
      );
      actionCell.appendChild(previewBtn);
    }
    if (item.download_url) {
      const dlBtn = el(
        'a',
        {
          href: item.download_url,
          class: 'btn btn-primary',
          target: '_blank',
          rel: 'noopener noreferrer',
          download: item.name
        },
        FILE_TYPES.VIDEO.includes(key) ? 'Stream / Download' : 'Download'
      );
      actionCell.appendChild(document.createTextNode(' '));
      actionCell.appendChild(dlBtn);
    }
  }

  return el('tr', {}, [nameCell, typeCell, sizeCell, actionCell]);
}

function renderParentRow(currentPath) {
  if (!currentPath) return null;
  const parent = getParentPath(currentPath);
  return el('tr', {}, [
    el('td', { class: 'cell-name is-folder' }, [
      el(
        'a',
        {
          href: `#/${parent}`,
          class: 'name-link',
          onClick: (e) => {
            e.preventDefault();
            navigate({ path: parent, search: '', extension: '', sort: '', page: 1 });
          }
        },
        [el('span', { style: { fontSize: '16px' } }, '..'), el('span', {}, 'Kembali ke direktori atas')]
      )
    ]),
    el('td', { class: 'text-xs', style: { color: 'var(--color-text-subtle)' } }, '-'),
    el('td', { class: 'text-xs', style: { color: 'var(--color-text-subtle)' } }, '-'),
    el('td', { class: 'cell-actions' })
  ]);
}

export function renderTable({ items, path, loading, error }) {
  if (loading) {
    return el('div', { class: 'data-card' }, [
      el('div', { class: 'loading-state' }, [el('span', { class: 'spinner' }), el('span', {}, 'Memuat data...')])
    ]);
  }

  if (error) {
    return el('div', { class: 'data-card' }, [
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, [icon(ICONS.file, 32)]),
        el('p', {}, 'Tidak dapat memuat data.')
      ])
    ]);
  }

  if (!items || items.length === 0) {
    return el('div', { class: 'data-card' }, [
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, [icon(ICONS.folder, 32)]),
        el('p', {}, 'Folder ini kosong.')
      ])
    ]);
  }

  const tbody = el('tbody', {});
  const parentRow = renderParentRow(path);
  if (parentRow) tbody.appendChild(parentRow);
  for (const item of items) {
    tbody.appendChild(renderRow(item, path));
  }

  return el('div', { class: 'data-card' }, [
    el('div', { class: 'data-table-wrap' }, [
      el('table', { class: 'data-table' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { style: { width: '50%' } }, 'Nama Objek'),
            el('th', { style: { width: '16%' } }, 'Tipe'),
            el('th', { style: { width: '16%' } }, 'Ukuran'),
            el('th', { class: 'text-right', style: { width: '18%' } }, 'Aksi')
          ])
        ]),
        tbody
      ])
    ])
  ]);
}
