const HF_API = "https://huggingface.co";
const DEFAULT_BRANCH = "main";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, x-repo, x-repo-type, x-requested-with",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders()
    },
  });
}

function extractToken(request, url) {
  let authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.trim().startsWith("Bearer ")) {
    return authHeader.trim();
  }
  const tokenParam = url.searchParams.get("token");
  if (tokenParam) {
    return `Bearer ${tokenParam.trim()}`;
  }
  return null;
}

async function fetchJson(url, auth) {
  try {
    const res = await fetch(url, { 
      headers: { 
        "Authorization": auth, 
        "User-Agent": "Novabase-Cloud-Router/2.0",
        "Accept": "application/json"
      } 
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { 
        error: errorData.error || res.statusText, 
        message: errorData.message || "Hugging Face API Error",
        status: res.status 
      };
    }
    return await res.json();
  } catch (err) {
    return { error: "Fetch Error", message: err.message, status: 502 };
  }
}

async function handleRepos(auth) {
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

async function handleFileFetch(path, url, auth) {
  const repo = url.searchParams.get("repo");
  const type = url.searchParams.get("type") || "dataset";
  if (!repo) return json({ error: "Missing repo parameter" }, 400);

  // HF Resolve URLs do NOT use the /api/ prefix
  // Datasets: https://huggingface.co/datasets/{repo}/resolve/{branch}/{path}
  // Models: https://huggingface.co/{repo}/resolve/{branch}/{path}
  const baseUrl = type === "dataset" ? `${HF_API}/datasets/${repo}` : `${HF_API}/${repo}`;
  const fileUrl = `${baseUrl}/resolve/${DEFAULT_BRANCH}/${path}`;

  try {
    const res = await fetch(fileUrl, {
      headers: { "Authorization": auth, "User-Agent": "Novabase-Cloud-Router/2.0" },
      redirect: "follow",
    });
    
    // Create a new response to ensure we can modify headers (CORS)
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.delete("Set-Cookie");

    // If it's a 404 from HF, return a cleaner error
    if (res.status === 404) {
      return json({ error: "Not Found", message: `File not found in repository: ${path}` }, 404);
    }

    return new Response(res.body, { 
      status: res.status, 
      statusText: res.statusText, 
      headers 
    });
  } catch (err) {
    return json({ error: "Failed to fetch file", message: err.message }, 502);
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const auth = extractToken(request, url);
    if (!auth) {
      return json({ 
        error: "Unauthorized", 
        message: "Missing or invalid Bearer token. Please login with Hugging Face." 
      }, 401);
    }

    if (url.pathname === "/_/repos") {
      return handleRepos(auth);
    }

    if (url.pathname === "/thumbnail" || url.pathname === "/video-thumbnail") {
      const target = url.searchParams.get("url");
      if (!target) return json({ error: "Missing url parameter" }, 400);
      try {
        const res = await fetch(target, {
          headers: { "Authorization": auth, "User-Agent": "Novabase-Cloud-Router/2.0" },
          redirect: "follow",
        });
        const h = new Headers(res.headers);
        h.set("Access-Control-Allow-Origin", "*");
        h.delete("Set-Cookie");
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
      } catch (err) {
        return json({ error: "Failed to fetch thumbnail", message: err.message }, 502);
      }
    }

    if (url.searchParams.has("repo")) {
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
      if (key !== "token") targetUrl.searchParams.set(key, value);
    });

    try {
      const res = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          "Authorization": auth,
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
