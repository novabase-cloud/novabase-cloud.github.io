import { buildKeyedUrl, getPassword } from './auth.js';
import { fetchJSON, fetchRaw } from './utils/http.js';
import { store } from './store.js';
import { API_BASE_URL, THUMBNAIL_DEFAULTS } from './config.js';

export function buildThumbnailUrl(imageUrl, options = {}) {
  const params = {
    url: imageUrl,
    ...(options.width && { w: String(options.width) }),
    ...(options.height && { h: String(options.height) }),
    ...(options.format && { format: options.format }),
    ...(options.quality && { q: String(options.quality) }),
    ...(options.fit && { fit: options.fit })
  };
  return buildKeyedUrl('/thumbnail', params);
}

export function buildVideoThumbnailUrl(videoDownloadUrl, options = {}) {
  const params = {
    url: videoDownloadUrl,
    time: options.time || '0.5s',
    ...(options.width && { w: String(options.width) }),
    ...(options.height && { h: String(options.height) })
  };
  return buildKeyedUrl('/video-thumbnail', params);
}

export function buildThumbnailUrlFromPath(filePath, options = {}) {
  const currentRepo = options.repo ? { id: options.repo, type: options.repoType || 'dataset' } : getCurrentRepo();
  const token = getPassword();
  
  if (!token) {
    throw new Error('Unauthorized: No access token found');
  }

  const fileUrl = `${API_BASE_URL}/${filePath.startsWith('/') ? filePath.substring(1) : filePath}?token=${encodeURIComponent(token)}&repo=${encodeURIComponent(currentRepo.id)}&type=${currentRepo.type}`;
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
  
  // http.js automatically handles the token injection
  const result = await fetchJSON(url);
  
  if (!result.ok) {
    const err = new Error(result.data?.message || result.data?.error || 'API error');
    err.status = result.status;
    throw err;
  }
  return result.data;
}

function getCurrentRepo() {
  const currentRepo = store.state.repo;
  if (!currentRepo?.id) {
    throw new Error('No repository selected');
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
  const res = await fetchRaw(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return await res.text();
}

export async function fetchFileBlob(path, repo, repoType) {
  const currentRepo = repo ? { id: repo, type: repoType || 'dataset' } : getCurrentRepo();
  const params = {
    repo: currentRepo.id,
    type: currentRepo.type
  };
  const url = buildKeyedUrl(`/${path}`, params);
  const res = await fetchRaw(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return await res.blob();
}

export async function fetchRepos() {
  const url = buildKeyedUrl('/_/repos');
  try {
    const result = await fetchJSON(url);
    return (result?.data?.repos) || [];
  } catch (err) {
    console.warn('[api] fetchRepos failed', err);
    return [];
  }
}
