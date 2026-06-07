import { el, icon, clear, mount } from '../utils/dom.js';
import { fetchFileText, fetchFileBlob } from '../api.js';
import { getPassword } from '../auth.js';
import { FILE_TYPES, API_BASE_URL, TEXT_PREVIEW_MAX_BYTES, CODE_LANG_HINT } from '../config.js';
import { getFileKey } from '../utils/format.js';
import { showToast } from './toast.js';

const ICONS = {
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
  wrap: '<path d="M3 6h18"></path><path d="M3 12h15a3 3 0 1 1 0 6h-4"></path><polyline points="9 16 12 19 9 22"></path><path d="M3 18h6"></path>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>'
};

let backdrop = null;
let currentView = null;

function close() {
  if (backdrop && backdrop.parentNode) {
    backdrop.parentNode.removeChild(backdrop);
  }
  backdrop = null;
  currentView = null;
  document.removeEventListener('keydown', onKey);
}

function onKey(e) {
  if (e.key === 'Escape') close();
}

function buildLoading() {
  return el('div', { class: 'modal-loading' }, [el('span', { class: 'spinner' })]);
}

function buildUnsupported(extension) {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'empty-state-icon' }, [icon(ICONS.file, 32)]),
    el('p', {}, `Preview is not available for file type "${extension || 'no extension'}".`),
    el('p', { style: { marginTop: '8px', fontSize: '12px' } }, 'Use the Download button to fetch the file.')
  ]);
}

function tryParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (_) {
    return { ok: false };
  }
}

function buildJsonView(text) {
  const parsed = tryParseJson(text);
  if (parsed.ok) {
    return buildCodeView(JSON.stringify(parsed.value, null, 2), 'json');
  }
  return buildCodeView(text, 'json');
}

function buildCsvView(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return el('div', { class: 'empty-state' }, 'File is empty.');
  }
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((row) => row.split(',').map((c) => c.trim()));
  const thead = el(
    'thead',
    {},
    [
      el(
        'tr',
        {},
        headers.map((h) =>
          el(
            'th',
            {
              style: {
                padding: '6px 12px',
                textAlign: 'left',
                borderBottom: '1px solid var(--color-border)'
              }
            },
            h
          )
        )
      )
    ]
  );
  const tbody = el(
    'tbody',
    {},
    rows.map((row) =>
      el(
        'tr',
        {},
        row.map((cell) =>
          el(
            'td',
            { style: { padding: '6px 12px', borderBottom: '1px solid var(--color-border)' } },
            cell
          )
        )
      )
    )
  );
  return el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [thead, tbody]);
}

function buildCodeView(text, ext) {
  const view = el('pre', { class: 'code-view', 'data-lang': ext || 'text' });
  if (!text) {
    view.appendChild(el('span', { class: 'code-empty' }, '// File is empty'));
    return view;
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineEl = el('span', { class: 'code-line' }, [
      el('span', { class: 'code-ln' }, String(i + 1)),
      el('span', { class: 'code-text' }, lines[i] || ' ')
    ]);
    view.appendChild(lineEl);
  }
  return view;
}

function buildImageView(url) {
  return el('img', { src: url, alt: 'Preview', class: 'modal-image' });
}

function buildVideoView(url) {
  return el('video', { controls: true, preload: 'metadata', src: url });
}

function buildSizeWarning(size, onContinue) {
  const sizeMb = (size / (1024 * 1024)).toFixed(2);
  return el('div', { class: 'size-warning' }, [
    el('div', { class: 'size-warning-icon' }, [icon(ICONS.file, 28)]),
    el('p', { class: 'size-warning-title' }, 'File is too large to preview'),
    el('p', { class: 'size-warning-desc' }, `File size: ${sizeMb} MB. Previews are limited to ${(TEXT_PREVIEW_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB by default.`),
    el('div', { class: 'size-warning-actions' }, [
      el(
        'button',
        {
          class: 'btn btn-primary',
          onClick: onContinue
        },
        'Continue preview anyway'
      )
    ])
  ]);
}

async function show(path, name) {
  const key = getFileKey(name);
  const isImage = FILE_TYPES.IMAGE.includes(key);
  const isVideo = FILE_TYPES.VIDEO.includes(key);
  const isJson = FILE_TYPES.JSON.includes(key);
  const isCsv = FILE_TYPES.CSV.includes(key);
  const isText = FILE_TYPES.TEXT.includes(key);

  const langHint = CODE_LANG_HINT[key] || (isJson ? 'JSON' : null);

  const titleText = name;
  const subtitle = langHint || (isVideo ? 'Video' : isImage ? 'Image' : isJson ? 'JSON' : isCsv ? 'CSV' : isText ? 'Text' : 'Unknown');

  const body = el('div', { class: 'modal-body' });
  mount(body, buildLoading());

  let wrapEnabled = false;
  const wrapBtn = el(
    'button',
    {
      class: 'modal-icon-btn',
      'aria-label': 'Toggle word wrap',
      title: 'Word wrap',
      onClick: () => {
        wrapEnabled = !wrapEnabled;
        const view = body.querySelector('.code-view');
        if (view) {
          view.classList.toggle('is-wrapped', wrapEnabled);
        }
        wrapBtn.classList.toggle('is-active', wrapEnabled);
      }
    },
    [icon(ICONS.wrap, 16)]
  );

  const closeBtn = el(
    'button',
    {
      class: 'modal-close',
      'aria-label': 'Close',
      onClick: close
    },
    [icon(ICONS.close, 18)]
  );

  const dlBtn = el(
    'a',
    {
      class: 'btn btn-secondary',
      target: '_blank',
      rel: 'noopener noreferrer',
      href: buildDownloadHref(path),
      download: name
    },
    [icon(ICONS.download, 14), el('span', {}, 'Download')]
  );

  const header = el('div', { class: 'modal-header' }, [
    el('div', { class: 'modal-title-wrap' }, [
      el('div', { class: 'modal-title' }, titleText),
      el('div', { class: 'modal-subtitle' }, subtitle)
    ]),
    el('div', { class: 'modal-actions' }, [wrapBtn, dlBtn, closeBtn])
  ]);

  const modal = el('div', { class: 'modal' }, [header, body]);
  backdrop = el(
    'div',
    {
      class: 'modal-backdrop',
      onClick: (e) => {
        if (e.target === backdrop) close();
      }
    },
    [modal]
  );

  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKey);

  currentView = { path, key, name };

  try {
    await renderContent(path, name, key, isImage, isVideo, isJson, isCsv, isText, body);
  } catch (err) {
    clear(body);
    body.appendChild(el('div', { class: 'empty-state' }, err.message || 'Failed to load preview.'));
    showToast({ kind: 'error', message: err.message || 'Failed to load preview' });
  }
}

async function renderContent(path, name, key, isImage, isVideo, isJson, isCsv, isText, body) {
  if (isVideo) {
    const blob = await fetchFileBlob(path);
    const url = URL.createObjectURL(blob);
    clear(body);
    body.appendChild(buildVideoView(url));
    const video = body.querySelector('video');
    if (video) video.addEventListener('loadeddata', () => URL.revokeObjectURL(url));
    return;
  }

  if (isImage && key !== 'svg') {
    const blob = await fetchFileBlob(path);
    const url = URL.createObjectURL(blob);
    clear(body);
    body.appendChild(buildImageView(url));
    return;
  }

  if (isJson) {
    const text = await fetchFileText(path);
    clear(body);
    body.appendChild(buildJsonView(text));
    return;
  }

  if (isCsv) {
    const text = await fetchFileText(path);
    clear(body);
    body.appendChild(buildCsvView(text));
    return;
  }

  if (isText) {
    await renderTextWithSizeCheck(path, key, body);
    return;
  }

  clear(body);
  body.appendChild(buildUnsupported(key));
}

async function renderTextWithSizeCheck(path, key, body) {
  const headResp = await fetch(buildDownloadHref(path), { method: 'HEAD' });
  const lenStr = headResp.headers.get('content-length');
  const size = lenStr ? parseInt(lenStr, 10) : 0;

  if (size > TEXT_PREVIEW_MAX_BYTES) {
    clear(body);
    body.appendChild(
      buildSizeWarning(size, async () => {
        clear(body);
        mount(body, buildLoading());
        try {
          const text = await fetchFileText(path);
          clear(body);
          body.appendChild(buildCodeView(text, key));
        } catch (err) {
          clear(body);
          body.appendChild(el('div', { class: 'empty-state' }, err.message || 'Failed to load preview.'));
        }
      })
    );
    return;
  }

  const text = await fetchFileText(path);
  clear(body);
  body.appendChild(buildCodeView(text, key));
}

function buildDownloadHref(path) {
  const key = getPassword();
  if (!key) return '#';
  const url = new URL(path, API_BASE_URL);
  url.searchParams.set('key', key);
  return url.toString();
}

export function openPreview({ path, name }) {
  show(path, name);
}
