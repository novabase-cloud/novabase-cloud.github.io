import { buildKeyedUrl } from './auth.js';
import { fetchJSON, fetchRaw } from './utils/http.js';

export async function listFolder({
  path = '',
  search = '',
  extension = '',
  sort = '',
  page = 1,
  limit = 0
} = {}) {
  const params = {
    search: search || undefined,
    extension: extension || undefined,
    sort: sort || undefined,
    page: page > 1 ? page : undefined,
    limit: limit > 0 ? limit : undefined
  };

  const url = buildKeyedUrl(path, params);
  const result = await fetchJSON(url);

  if (!result.ok) {
    const err = new Error(result.data?.error || `Request gagal (${result.status})`);
    err.status = result.status;
    err.payload = result.data;
    throw err;
  }

  return result.data;
}

export async function fetchFileText(path) {
  const url = buildKeyedUrl(path);
  const response = await fetchRaw(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat file (${response.status})`);
  }
  return response.text();
}

export async function fetchFileBlob(path) {
  const url = buildKeyedUrl(path);
  const response = await fetchRaw(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat file (${response.status})`);
  }
  return response.blob();
}
