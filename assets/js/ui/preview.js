import { el, icon, clear, mount } from '../utils/dom.js';
import { fetchFileText, fetchFileBlob } from '../api.js';
import { getPassword } from '../auth.js';
import { store } from '../store.js';
import { FILE_TYPES, API_BASE_URL, TEXT_PREVIEW_MAX_BYTES, CODE_LANG_HINT } from '../config.js';
import { getFileKey } from '../utils/format.js';
import { showToast } from './toast.js';

const ICONS = {
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
  wrap: '<path d="M3 6h18"></path><path d="M3 12h15a3 3 0 1 1 0 6h-4"></path><polyline points="9 16 12 19 9 22"></path><path d="M3 18h6"></path>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>',
  left: '<polyline points="15 18 9 12 15 6"></polyline>',
  right: '<polyline points="9 18 15 12 9 6"></polyline>',
  play: '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
  pause: '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>',
  skipBack: '<polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line>',
  skipForward: '<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
  volumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>',
  minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>',
  video: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>'
};

let backdrop = null;
let currentView = null;
let mediaItems = [];
let currentIndex = -1;
let videoElement = null;

function isMedia(key) {
  return FILE_TYPES.IMAGE.includes(key) || FILE_TYPES.VIDEO.includes(key);
}

function buildDownloadHref(path) {
  const key = getPassword();
  if (!key) return '#';
  const url = new URL(path, API_BASE_URL);
  url.searchParams.set('key', key);
  return url.toString();
}

function close() {
  if (backdrop && backdrop.parentNode) {
    backdrop.parentNode.removeChild(backdrop);
  }
  backdrop = null;
  currentView = null;
  mediaItems = [];
  currentIndex = -1;
  videoElement = null;
  document.removeEventListener('keydown', onKey);
}

function onKey(e) {
  if (e.key === 'Escape') { close(); return; }
  if (videoElement) {
    if (e.key === ' ') { e.preventDefault(); togglePlay(videoElement); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); videoElement.volume = Math.min(1, +(videoElement.volume + 0.1).toFixed(2)); videoElement.muted = false; return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); videoElement.volume = Math.max(0, +(videoElement.volume - 0.1).toFixed(2)); return; }
    if (e.key === 'm' || e.key === 'M') { videoElement.muted = !videoElement.muted; return; }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(videoElement); return; }
  }
  if (e.key === ' ') { e.preventDefault(); return; }
  if (!mediaItems.length) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex + 1); }
}

function togglePlay(el) {
  if (el.paused || el.ended) { el.play(); } else { el.pause(); }
}

function toggleFullscreen(el) {
  if (document.fullscreenElement) { document.exitFullscreen(); }
  else { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let touchStartX = 0;
let touchStartY = 0;

function onTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function onTouchEnd(e) {
  if (currentIndex < 0) return;
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    if (dx < 0) goTo(currentIndex + 1);
    else goTo(currentIndex - 1);
  }
}

function goTo(idx) {
  if (idx < 0 || idx >= mediaItems.length || idx === currentIndex) return;
  currentIndex = idx;
  loadMedia(currentIndex);
  updateNavButtons();
  updateCarousel();
}

function getMediaItems() {
  const allItems = store.state.data?.results || [];
  return allItems.filter((item) => {
    if (item.type === 'directory') return false;
    const key = getFileKey(item.name);
    return isMedia(key);
  });
}

function showMediaViewer(path, name) {
  mediaItems = getMediaItems();
  currentIndex = mediaItems.findIndex((item) => item.full_path === path);

  const key = getFileKey(name);
  const isVid = FILE_TYPES.VIDEO.includes(key);
  const subtitleText = isVid ? 'Video' : 'Image';

  const closeBtn = el('button', { class: 'modal-close', 'aria-label': 'Close', onClick: close }, [icon(ICONS.close, 20)]);
  const dlBtn = el('a', { class: 'btn btn-secondary btn-sm', target: '_blank', rel: 'noopener noreferrer', href: buildDownloadHref(path), download: name }, [icon(ICONS.download, 14), el('span', {}, 'Download')]);

  const header = el('div', { class: 'media-viewer-header' }, [
    el('div', { class: 'media-viewer-header-left' }, [
      el('span', { class: 'media-viewer-title' }, name),
      el('span', { class: 'media-viewer-subtitle' }, subtitleText)
    ]),
    el('div', { class: 'media-viewer-header-right' }, [dlBtn, closeBtn])
  ]);

  const mediaSlot = el('div', { class: 'media-slot' });
  const leftArrow = el('button', { type: 'button', class: 'media-arrow media-arrow-left', 'aria-label': 'Previous', onClick: () => goTo(currentIndex - 1) }, [icon(ICONS.left, 24)]);
  const rightArrow = el('button', { type: 'button', class: 'media-arrow media-arrow-right', 'aria-label': 'Next', onClick: () => goTo(currentIndex + 1) }, [icon(ICONS.right, 24)]);

  const body = el('div', { class: 'media-viewer-body' }, [leftArrow, rightArrow, mediaSlot]);

  const carousel = el('div', { class: 'media-carousel' });
  const footer = el('div', { class: 'media-viewer-footer' }, [carousel]);

  const viewer = el('div', { class: 'media-viewer' }, [header, body, footer]);
  backdrop = el('div', { class: 'media-viewer-backdrop', onClick: (e) => { if (e.target === backdrop) close(); }, onTouchStart, onTouchEnd }, [viewer]);

  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKey);
  currentView = { path, name, key };

  buildCarousel(carousel);
  updateNavButtons();
  updateCarousel();
  loadMedia(currentIndex);
}

function show(path, name) {
  mediaItems = [];
  currentIndex = -1;
  const key = getFileKey(name);
  const isImage = FILE_TYPES.IMAGE.includes(key);
  const isVideo = FILE_TYPES.VIDEO.includes(key);
  const isJson = FILE_TYPES.JSON.includes(key);
  const isCsv = FILE_TYPES.CSV.includes(key);
  const isText = FILE_TYPES.TEXT.includes(key);
  const langHint = CODE_LANG_HINT[key] || (isJson ? 'JSON' : null);
  const subtitle = langHint || (isVideo ? 'Video' : isImage ? 'Image' : isJson ? 'JSON' : isCsv ? 'CSV' : isText ? 'Text' : 'Unknown');

  const closeBtn = el('button', { class: 'modal-close', 'aria-label': 'Close', onClick: close }, [icon(ICONS.close, 18)]);
  const dlBtn = el('a', { class: 'btn btn-secondary', target: '_blank', rel: 'noopener noreferrer', href: buildDownloadHref(path), download: name }, [icon(ICONS.download, 14), el('span', {}, 'Download')]);

  let wrapEnabled = false;
  const wrapBtn = el('button', { class: 'modal-icon-btn', 'aria-label': 'Toggle word wrap', title: 'Word wrap', onClick: () => {
    wrapEnabled = !wrapEnabled;
    const view = body.querySelector('.code-view');
    if (view) view.classList.toggle('is-wrapped', wrapEnabled);
    wrapBtn.classList.toggle('is-active', wrapEnabled);
  }}, [icon(ICONS.wrap, 16)]);

  const header = el('div', { class: 'modal-header' }, [
    el('div', { class: 'modal-title-wrap' }, [
      el('div', { class: 'modal-title' }, name),
      el('div', { class: 'modal-subtitle' }, subtitle)
    ]),
    el('div', { class: 'modal-actions' }, [wrapBtn, dlBtn, closeBtn])
  ]);

  const body = el('div', { class: 'modal-body' });
  const modal = el('div', { class: 'modal' }, [header, body]);
  backdrop = el('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === backdrop) close(); } }, [modal]);

  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKey);
  currentView = { path, name, key };

  renderContent(path, name, key, isImage, isVideo, isJson, isCsv, isText, body);
}

function updateNavButtons() {
  if (!backdrop) return;
  const left = backdrop.querySelector('.media-arrow-left');
  const right = backdrop.querySelector('.media-arrow-right');
  if (!left || !right) return;
  left.classList.toggle('media-arrow-hidden', currentIndex <= 0);
  right.classList.toggle('media-arrow-hidden', currentIndex >= mediaItems.length - 1);
}

function buildCarousel(container) {
  clear(container);
  if (mediaItems.length < 2) { container.style.display = 'none'; return; }
  container.style.display = '';

  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const key = getFileKey(item.name);
    const isVid = FILE_TYPES.VIDEO.includes(key);
    const thumb = el('div', { class: 'carousel-thumb', 'data-index': i, onClick: () => goTo(i) });
    const img = isVid
      ? el('video', { preload: 'metadata', muted: true, playsinline: true, src: item.download_url, class: 'carousel-thumb-img' })
      : el('img', { loading: 'lazy', src: item.download_url, class: 'carousel-thumb-img', alt: item.name });
    thumb.appendChild(img);
    if (isVid) {
      thumb.appendChild(el('span', { class: 'carousel-thumb-play' }, [icon(ICONS.play, 12)]));
    }
    container.appendChild(thumb);
  }
}

function updateCarousel() {
  const container = backdrop?.querySelector('.media-carousel');
  if (!container) return;
  const thumbs = container.querySelectorAll('.carousel-thumb');
  thumbs.forEach((t, i) => t.classList.toggle('is-active', i === currentIndex));
  const active = container.querySelector('.is-active');
  if (active) active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
}

async function loadMedia(idx) {
  if (videoElement) { videoElement.pause(); videoElement = null; }
  const slot = backdrop?.querySelector('.media-slot');
  if (!slot || idx < 0 || idx >= mediaItems.length) return;
  const item = mediaItems[idx];
  const key = getFileKey(item.name);
  const isVid = FILE_TYPES.VIDEO.includes(key);
  const isImg = FILE_TYPES.IMAGE.includes(key) && key !== 'svg';

  clear(slot);
  mount(slot, el('div', { class: 'modal-loading' }, [el('span', { class: 'spinner' })]));

  const header = backdrop?.querySelector('.media-viewer-header');
  if (header) {
    const title = header.querySelector('.media-viewer-title');
    const sub = header.querySelector('.media-viewer-subtitle');
    if (title) title.textContent = item.name;
    if (sub) sub.textContent = isVid ? 'Video' : 'Image';
  }

  try {
    const blob = await fetchFileBlob(item.full_path);
    const url = URL.createObjectURL(blob);
    clear(slot);

    if (isVid) {
      mount(slot, buildVideoPlayer(url));
    } else if (isImg) {
      const img = el('img', { class: 'modal-image', src: url, alt: item.name });
      mount(slot, img);
    }
  } catch (err) {
    clear(slot);
    slot.appendChild(el('div', { class: 'empty-state' }, 'Failed to load media.'));
  }
}

function buildVideoPlayer(url) {
  videoElement = null;

  const video = el('video', {
    class: 'video-player-element',
    src: url,
    preload: 'metadata',
    playsinline: true
  });

  const seekBar = el('input', { type: 'range', class: 'video-seek-bar', min: 0, max: 1000, value: 0, step: 0.1 });
  const progressWrap = el('div', { class: 'video-progress' }, [seekBar]);

  const playBtn = el('button', { class: 'video-btn video-btn-play', 'aria-label': 'Play/Pause', onClick: () => togglePlay(video) });
  const rwBtn = el('button', { class: 'video-btn', 'aria-label': 'Rewind 10s', onClick: () => { video.currentTime = Math.max(0, video.currentTime - 10); } }, [icon(ICONS.skipBack, 14)]);
  const ffBtn = el('button', { class: 'video-btn', 'aria-label': 'Forward 10s', onClick: () => { video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); } }, [icon(ICONS.skipForward, 14)]);

  const timeEl = el('span', { class: 'video-time' }, '0:00 / 0:00');

  const muteBtn = el('button', { class: 'video-btn', 'aria-label': 'Mute/Unmute', onClick: () => { video.muted = !video.muted; } });
  const volSlider = el('input', { type: 'range', class: 'video-vol-slider', min: 0, max: 100, value: 100 });
  const volWrap = el('div', { class: 'video-vol-wrap' }, [muteBtn, volSlider]);

  const speedSel = el('select', { class: 'video-speed' }, [
    el('option', { value: '0.25' }, '0.25x'), el('option', { value: '0.5' }, '0.5x'),
    el('option', { value: '1' }, '1x'), el('option', { value: '1.5' }, '1.5x'),
    el('option', { value: '2' }, '2x'), el('option', { value: '3' }, '3x'), el('option', { value: '4' }, '4x')
  ]);
  speedSel.value = '1';

  const fsBtn = el('button', { class: 'video-btn', 'aria-label': 'Fullscreen', onClick: () => toggleFullscreen(video) }, [icon(ICONS.maximize, 14)]);

  const row = el('div', { class: 'video-controls-row' }, [playBtn, rwBtn, ffBtn, timeEl, volWrap, speedSel, fsBtn]);
  const controls = el('div', { class: 'video-controls' }, [progressWrap, row]);

  const container = el('div', { class: 'video-player' }, [video, controls]);

  function updatePlayIcon() { clear(playBtn); playBtn.appendChild(icon(video.paused ? ICONS.play : ICONS.pause, 14)); }
  function updateMuteIcon() { clear(muteBtn); muteBtn.appendChild(icon(video.muted || video.volume === 0 ? ICONS.volumeX : ICONS.volume, 14)); }
  function updateTimeDisplay() {
    timeEl.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    const pct = video.duration ? (video.currentTime / video.duration) * 1000 : 0;
    seekBar.value = pct;
  }

  video.addEventListener('loadedmetadata', () => {
    seekBar.max = Math.floor(video.duration * 10) || 1000;
    updateTimeDisplay();
  });
  video.addEventListener('timeupdate', updateTimeDisplay);
  video.addEventListener('play', updatePlayIcon);
  video.addEventListener('pause', updatePlayIcon);
  video.addEventListener('volumechange', updateMuteIcon);

  updatePlayIcon();
  updateMuteIcon();

  seekBar.addEventListener('input', () => {
    video.currentTime = (seekBar.value / seekBar.max) * (video.duration || 0);
  });

  volSlider.addEventListener('input', () => {
    video.volume = volSlider.value / 100;
    if (video.volume === 0) video.muted = true;
    else if (video.muted) video.muted = false;
  });

  speedSel.addEventListener('change', () => { video.playbackRate = parseFloat(speedSel.value); });

  let controlsTimer;
  function showControls() {
    container.classList.add('show-controls');
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => { if (!video.paused) container.classList.remove('show-controls'); }, 3000);
  }
  container.addEventListener('mousemove', showControls);
  container.addEventListener('mouseenter', showControls);
  container.addEventListener('mouseleave', () => container.classList.remove('show-controls'));
  video.addEventListener('play', showControls);
  video.addEventListener('pause', () => container.classList.add('show-controls'));

  videoElement = video;
  return container;
}

function renderContent(path, name, key, isImage, isVideo, isJson, isCsv, isText, body) {
  mount(body, el('div', { class: 'modal-loading' }, [el('span', { class: 'spinner' })]));

  (async () => {
    try {
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
    } catch (err) {
      clear(body);
      body.appendChild(el('div', { class: 'empty-state' }, err.message || 'Failed to load preview.'));
      showToast({ kind: 'error', message: err.message || 'Failed to load preview' });
    }
  })();
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
  try { return { ok: true, value: JSON.parse(text) }; }
  catch (_) { return { ok: false }; }
}

function buildJsonView(text) {
  const parsed = tryParseJson(text);
  if (parsed.ok) return buildCodeView(JSON.stringify(parsed.value, null, 2), 'json');
  return buildCodeView(text, 'json');
}

function buildCsvView(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return el('div', { class: 'empty-state' }, 'File is empty.');
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((row) => row.split(',').map((c) => c.trim()));
  const thead = el('thead', {}, [el('tr', {}, headers.map((h) => el('th', { style: { padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' } }, h)))]);
  const tbody = el('tbody', {}, rows.map((row) => el('tr', {}, row.map((cell) => el('td', { style: { padding: '6px 12px', borderBottom: '1px solid var(--color-border)' } }, cell)))));
  return el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [thead, tbody]);
}

function buildCodeView(text, ext) {
  const view = el('pre', { class: 'code-view', 'data-lang': ext || 'text' });
  if (!text) { view.appendChild(el('span', { class: 'code-empty' }, '// File is empty')); return view; }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    view.appendChild(el('span', { class: 'code-line' }, [el('span', { class: 'code-ln' }, String(i + 1)), el('span', { class: 'code-text' }, lines[i] || ' ')]));
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
    el('div', { class: 'size-warning-actions' }, [el('button', { class: 'btn btn-primary', onClick: onContinue }, 'Continue preview anyway')])
  ]);
}

async function renderTextWithSizeCheck(path, key, body) {
  const headResp = await fetch(buildDownloadHref(path), { method: 'HEAD' });
  const lenStr = headResp.headers.get('content-length');
  const size = lenStr ? parseInt(lenStr, 10) : 0;
  if (size > TEXT_PREVIEW_MAX_BYTES) {
    clear(body);
    body.appendChild(buildSizeWarning(size, async () => {
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
    }));
    return;
  }
  const text = await fetchFileText(path);
  clear(body);
  body.appendChild(buildCodeView(text, key));
}

export function openPreview({ path, name }) {
  const key = getFileKey(name);
  if (isMedia(key)) {
    showMediaViewer(path, name);
  } else {
    show(path, name);
  }
}
