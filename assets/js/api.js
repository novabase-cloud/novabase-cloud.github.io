import { buildKeyedUrl } from './auth.js';
import { fetchJSON, fetchRaw } from './utils/http.js';

export async function listFolder({ path, search, extension, sort, page, limit, repo, repo_type }) {
  const params = {
    search: search || '',
    extension: extension || '',
    sort: sort || '',
    page: String(page || 1),
    limit: String(limit || 25),
    repo: repo || 'Novabase/Tiktok',
    type: repo_type || 'dataset'
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

export async function fetchFileText(path, repo, repoType) {
  const params = {};
  if (repo) params.repo = repo;
  if (repoType) params.type = repoType;
  const url = buildKeyedUrl(`/${path}`, params);
  return await fetchRaw(url);
}

export async function fetchFileBlob(path, repo, repoType) {
  const params = {};
  if (repo) params.repo = repo;
  if (repoType) params.type = repoType;
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
