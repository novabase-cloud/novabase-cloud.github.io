import { buildKeyedUrl, getPassword } from './auth.js';
import { fetchJSON, fetchRaw } from './utils/http.js';
import { store } from './store.js';
import { API_BASE_URL, THUMBNAIL_DEFAULTS } from './config.js';

export function buildThumbnailUrl(imageUrl, options = {}) {
  const params = new URLSearchParams();
  params.set('url', imageUrl);
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.format) params.set('format', options.format);
  if (options.quality) params.set('q', String(options.quality));
  if (options.fit) params.set('fit', options.fit);
  return `${API_BASE_URL}/thumbnail?${params.toString()}`;
}

export function buildVideoThumbnailUrl(videoDownloadUrl, options = {}) {
  const params = new URLSearchParams();
  params.set('url', videoDownloadUrl);
  if (options.time) params.set('time', options.time);
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  const defaultTime = '0.5s';
  if (!options.time) params.set('time', defaultTime);
  return `${API_BASE_URL}/video-thumbnail?${params.toString()}`;
}

export function buildThumbnailUrlFromPath(filePath, options = {}) {
  const currentRepo = options.repo ? { id: options.repo, type: options.repoType || 'dataset' } : getCurrentRepo();
  const key = store.getAuthKey() || getPassword();
  if (!key) {
    throw new Error('Not authenticated');
  }
  const fileUrl = `${API_BASE_URL}/${filePath}?key=${key}&repo=${encodeURIComponent(currentRepo.id)}&type=${currentRepo.type}`;
  return buildThumbnailUrl(fileUrl, options);
}

export async function listFolder({ path, search, extension, sort, page, limit, repo, repo_type }) {
  const currentRepo = repo ? { id: repo, type: repo_type || 'dataset' } : getCurrentRepo();
  const params = {
    search: search || '',
    extension: extension || '',
    sort: sort || '',
    page: String(page || 1),
    limit: String(limit || 25),
    repo: currentRepo.id,
    type: currentRepo.type
  };
  const url = buildKeyedUrl(path ? `/${path}` : '/', params);
  const result = await fetchJSON(url);
  if (!result.ok) {
    const err = new Error(result.data?.error || 'API error');
    err.status = result.status;
    throw err;
  }
  return result.data;
}

function getCurrentRepo() {
  const currentRepo = store.state.repo;
  if (!currentRepo?.id) {
    throw new Error('No repository selected. Please add/select a repository from the sidebar.');
  }
  return currentRepo;
}

export async function fetchFileText(path, repo, repoType) {
  const currentRepo = repo ? { id: repo, type: repoType || 'dataset' } : getCurrentRepo();
  const params = {
    repo: currentRepo.id,
    type: currentRepo.type
  };
  const url = buildKeyedUrl(`/${path}`, params);
  return await fetchRaw(url);
}

export async function fetchFileBlob(path, repo, repoType) {
  const currentRepo = repo ? { id: repo, type: repoType || 'dataset' } : getCurrentRepo();
  const params = {
    repo: currentRepo.id,
    type: currentRepo.type
  };
  const url = buildKeyedUrl(`/${path}`, params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return await res.blob();
}

export async function fetchRepos() {
  const url = buildKeyedUrl('/_/repos');
  try {
    const result = await fetchJSON(url);
    return (result?.data?.repos) || [];
  } catch (_) {
    return [];
  }
}
