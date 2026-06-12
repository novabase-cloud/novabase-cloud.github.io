import { HF_API, DEFAULT_BRANCH, USER_AGENT } from "../config.js";
import { json } from "../utils/response.js";

export async function handleThumbnails(request, url, auth, ctx) {
  let target = url.searchParams.get("url");
  if (!target) return json({ error: "Missing url parameter" }, 400);

  const token = auth || url.searchParams.get("token");

  try {
    const targetObj = new URL(target);
    if (targetObj.hostname === url.hostname) {
      const repo = targetObj.searchParams.get("repo");
      const type = targetObj.searchParams.get("type") || "dataset";
      const path = targetObj.pathname.replace(/^\//, "");
      if (repo) {
        const baseUrl = type === "dataset" ? `${HF_API}/datasets/${repo}` : `${HF_API}/${repo}`;
        target = `${baseUrl}/resolve/${DEFAULT_BRANCH}/${path}`;
      }
    }
  } catch (e) {
  }

  const fetchOptions = {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  };

  if (token) {
    fetchOptions.headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const cache = caches.default;
  const cacheUrl = new URL(url.origin + url.pathname);
  cacheUrl.searchParams.set("url", target);
  if (token) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    cacheUrl.searchParams.set("_u", hash);
  }
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const h = new Headers(cached.headers);
    h.set("X-Cache-Status", "edge-hit");
    return new Response(cached.body, { status: cached.status, headers: h });
  }

  try {
    const res = await fetch(target, fetchOptions);
    if (!res.ok) {
      return json({ error: "Failed to fetch source image", status: res.status }, res.status);
    }

    const h = new Headers(res.headers);
    h.set("Cache-Control", "public, max-age=31536000, immutable");
    h.set("Access-Control-Allow-Origin", "*");
    h.set("X-Cache-Status", "origin-fetch");
    h.delete("Set-Cookie");

    const response = new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (err) {
    return json({ error: "Failed to fetch source", message: err.message }, 502);
  }
}
