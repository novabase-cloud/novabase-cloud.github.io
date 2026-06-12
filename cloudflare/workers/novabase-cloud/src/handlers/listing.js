import { HF_API, DEFAULT_BRANCH } from "../config.js";
import { fetchJson } from "../utils/fetch.js";
import { json } from "../utils/response.js";

export async function handleListing(url, auth) {
  const repo = url.searchParams.get("repo");
  const type = url.searchParams.get("type") || "dataset";
  const search = url.searchParams.get("search") || "";
  const sort = url.searchParams.get("sort") || "";
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 25;
  let path = url.pathname === "/" ? "" : url.pathname.replace(/^\//, "");

  if (!repo) return json({ error: "Missing repo parameter" }, 400);

  const apiPath = type === "model" ? "models" : "datasets";
  const treeUrl = `${HF_API}/api/${apiPath}/${repo}/tree/${DEFAULT_BRANCH}/${path}`;

  const items = await fetchJson(treeUrl, auth);
  if (items.error) {
    return json({ error: items.error, message: items.message }, items.status || 502);
  }

  if (!Array.isArray(items)) {
    return json({ error: "Invalid Response", message: "HF API did not return an array of items" }, 502);
  }

  let filtered = items;
  if (search) {
    const q = search.toLowerCase();
    filtered = items.filter(i => (i.name || "").toLowerCase().includes(q));
  }
  
  if (sort === "name") filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  else if (sort === "-name") filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));

  const start = (page - 1) * limit;
  const results = filtered.slice(start, start + limit).map(i => {
    const itemPath = i.path || "";
    const itemName = i.name || itemPath.split("/").pop() || "unnamed";
    
    const dlUrl = new URL(url.origin);
    dlUrl.pathname = `/${itemPath}`;
    dlUrl.searchParams.set("repo", repo);
    dlUrl.searchParams.set("type", type);
    
    const token = auth.startsWith("Bearer ") ? auth.substring(7) : auth;
    if (token) dlUrl.searchParams.set("token", token);

    return {
      ...i,
      name: itemName,
      full_path: itemPath,
      download_url: dlUrl.toString()
    };
  });

  return json({
    results,
    pagination: { 
      current_page: page, 
      limit_per_page: limit, 
      total_items: filtered.length, 
      total_pages: Math.ceil(filtered.length / limit) 
    },
    path,
    repo,
    type,
    search,
    sort,
  });
}
