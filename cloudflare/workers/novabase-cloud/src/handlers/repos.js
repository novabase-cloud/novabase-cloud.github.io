import { HF_API } from "../config.js";
import { fetchJson } from "../utils/fetch.js";
import { json } from "../utils/response.js";

export async function handleRepos(auth) {
  const [models, datasets] = await Promise.all([
    fetchJson(`${HF_API}/api/models?author=me&sort=lastModified&direction=-1&limit=100`, auth),
    fetchJson(`${HF_API}/api/datasets?author=me&sort=lastModified&direction=-1&limit=100`, auth),
  ]);

  if (models.error || datasets.error) {
    return json({ error: "HF_API_ERROR", details: models.error || datasets.error }, 502);
  }

  const map = (item, type) => item.id ? { id: item.id, type, private: !!item.private, lastModified: item.lastModified } : null;
  const repos = [
    ...(Array.isArray(models) ? models.map(r => map(r, 'model')).filter(Boolean) : []),
    ...(Array.isArray(datasets) ? datasets.map(r => map(r, 'dataset')).filter(Boolean) : []),
  ];
  repos.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
  return json({ repos });
}
