const HF_API_BASE = "https://huggingface.co";

async function handleReposList(authHeader) {
  const [modelsRes, datasetsRes] = await Promise.all([
    fetch("https://huggingface.co/api/models?author=me&sort=lastModified&direction=-1&limit=50", {
      headers: { Authorization: authHeader },
    }),
    fetch("https://huggingface.co/api/datasets?author=me&sort=lastModified&direction=-1&limit=50", {
      headers: { Authorization: authHeader },
    }),
  ]);

  const models = modelsRes.ok ? await modelsRes.json() : [];
  const datasets = datasetsRes.ok ? await datasetsRes.json() : [];

  const mapRepo = (item, type) => ({
    id: item.id,
    type,
    private: item.private || false,
    lastModified: item.lastModified,
  });

  const repos = [
    ...(Array.isArray(models) ? models.map(r => mapRepo(r, 'model')) : []),
    ...(Array.isArray(datasets) ? datasets.map(r => mapRepo(r, 'dataset')) : []),
  ];

  repos.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));

  return new Response(JSON.stringify({ repos }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
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

    let authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        authHeader = `Bearer ${tokenParam}`;
      }
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "Missing or invalid Bearer token. Please login with Hugging Face.",
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (url.pathname === "/_/repos") {
      return handleReposList(authHeader);
    }

    const targetUrl = new URL(url.pathname, HF_API_BASE);
    url.searchParams.forEach((value, key) => {
      if (key !== "key") targetUrl.searchParams.set(key, value);
    });

    try {
      const hfResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          Authorization: authHeader,
          "Content-Type": request.headers.get("Content-Type") || "application/json",
          "User-Agent": "Novabase-Cloud-Router/2.0",
        },
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "follow",
      });

      const responseHeaders = new Headers(hfResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.delete("Set-Cookie");

      return new Response(hfResponse.body, {
        status: hfResponse.status,
        statusText: hfResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: "Routing Error",
        message: err.message,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
