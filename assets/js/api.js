import { buildKeyedUrl, getPassword } from './auth.js';
import { fetchJSON, fetchRaw } from './utils/http.js';
import { store } from './store.js';

export function buildImageUrl(filePath, repo, repoType) {
  const currentRepo = repo ? { id: repo, type: repoType || 'dataset' } : getCurrentRepo();
  const params = {
    repo: currentRepo.id,
    type: currentRepo.type
  };
  return buildKeyedUrl(`/${filePath.startsWith('/') ? filePath.substring(1) : filePath}`, params);
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
