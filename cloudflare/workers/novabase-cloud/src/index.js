const HF_API = "https://huggingface.co";
const DEFAULT_BRANCH = "main";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function extractToken(request, url) {
  let header = request.headers.get("Authorization");
  if (header && header.startsWith("Bearer ")) return header;
  const param = url.searchParams.get("token");
  if (param) return `Bearer ${param}`;
  return null;
}

async function fetchJson(url, auth) {
  const res = await fetch(url, { headers: { Authorization: auth, "User-Agent": "Novabase-Cloud-Router/2.0" } });
  if (!res.ok) return { error: res.statusText, status: res.status };
  return await res.json();
}

async function handleRepos(auth) {
  const [models, datasets] = await Promise.all([
    fetchJson(`${HF_API}/api/models?author=me&sort=lastModified&direction=-1&limit=50`, auth),
    fetchJson(`${HF_API}/api/datasets?author=me&sort=lastModified&direction=-1&limit=50`, auth),
  ]);
  const map = (item, type) => item.id ? { id: item.id, type, private: !!item.private, lastModified: item.lastModified } : null;
  const repos = [
    ...(Array.isArray(models) ? models.map(r => map(r, 'model')).filter(Boolean) : []),
    ...(Array.isArray(datasets) ? datasets.map(r => map(r, 'dataset')).filter(Boolean) : []),
  ];
  repos.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
  return json({ repos });
}

async function handleListing(url, auth) {
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

  let items;
  try {
    const res = await fetch(treeUrl, { headers: { Authorization: auth, "User-Agent": "Novabase-Cloud-Router/2.0" } });
    if (!res.ok) return json({ error: res.statusText, status: res.status }, res.status);
    items = await res.json();
  } catch {
    return json({ error: "Failed to fetch listing" }, 502);
  }

  let filtered = items;
  if (search) {
    const q = search.toLowerCase();
    filtered = items.filter(i => (i.name || "").toLowerCase().includes(q));
  }
  if (sort === "name") filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  else if (sort === "-name") filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));

  const start = (page - 1) * limit;
  const results = filtered.slice(start, start + limit);
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit);

  return json({
    results,
    pagination: { page, limit, totalCount, totalPages },
    path,
    repo,
    type,
    search,
    sort,
  });
}

async function handleFileFetch(path, url, auth) {
  const repo = url.searchParams.get("repo");
  const type = url.searchParams.get("type") || "dataset";
  if (!repo) return json({ error: "Missing repo parameter" }, 400);

  const apiPath = type === "model" ? "models" : "datasets";
  const fileUrl = `${HF_API}/api/${apiPath}/${repo}/resolve/${DEFAULT_BRANCH}/${path}`;

  try {
    const res = await fetch(fileUrl, {
      headers: { Authorization: auth, "User-Agent": "Novabase-Cloud-Router/2.0" },
      redirect: "follow",
    });
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.delete("Set-Cookie");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  } catch {
    return json({ error: "Failed to fetch file" }, 502);
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, x-repo, x-repo-type, x-requested-with",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const auth = extractToken(request, url);
    if (!auth) {
      return json({ error: "Unauthorized", message: "Missing or invalid Bearer token. Please login with Hugging Face." }, 401);
    }

    if (url.pathname === "/_/repos") {
      return handleRepos(auth);
    }

    if (url.pathname === "/thumbnail" || url.pathname === "/video-thumbnail") {
      const target = url.searchParams.get("url");
      if (!target) return json({ error: "Missing url parameter" }, 400);
      try {
        const res = await fetch(target, {
          headers: { Authorization: auth, "User-Agent": "Novabase-Cloud-Router/2.0" },
          redirect: "follow",
        });
        const h = new Headers(res.headers);
        h.set("Access-Control-Allow-Origin", "*");
        h.delete("Set-Cookie");
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
      } catch {
        return json({ error: "Failed to fetch thumbnail" }, 502);
      }
    }

    const hasRepo = url.searchParams.has("repo");

    if (hasRepo) {
      const isListing = url.pathname === "/" || url.searchParams.has("page") || url.searchParams.has("limit");
      if (isListing) {
        return handleListing(url, auth);
      }
      const path = url.pathname.replace(/^\//, "");
      return handleFileFetch(path, url, auth);
    }

    // Catch-all: pass-through proxy to Hugging Face API
    const targetUrl = new URL(url.pathname, HF_API);
    url.searchParams.forEach((value, key) => {
      if (key !== "key") targetUrl.searchParams.set(key, value);
    });

    try {
      const res = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          Authorization: auth,
          "Content-Type": request.headers.get("Content-Type") || "application/json",
          "User-Agent": "Novabase-Cloud-Router/2.0",
        },
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "follow",
      });
      const h = new Headers(res.headers);
      h.set("Access-Control-Allow-Origin", "*");
      h.delete("Set-Cookie");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    } catch (err) {
      return json({ error: "Routing Error", message: err.message }, 502);
    }
  },
};
