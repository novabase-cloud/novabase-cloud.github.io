import { HF_API, DEFAULT_BRANCH, USER_AGENT } from "../config.js";
import { json } from "../utils/response.js";
import { processImage, detectFormat } from "../utils/image.js";

const SUPABASE_THUMBNAIL_URL = "https://lehfwzwfferrgjrfwiot.supabase.co/functions/v1/thumbnail-resizer";

const CACHE_PARAMS = ["url", "w", "h", "q", "format", "fit", "repo", "type"];

async function buildCacheKey(url, token) {
  const cacheUrl = new URL(url.origin + url.pathname);

  for (const key of CACHE_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) cacheUrl.searchParams.set(key, value);
  }

  if (token) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    cacheUrl.searchParams.set("_u", hash);
  }

  cacheUrl.search = new URLSearchParams([...cacheUrl.searchParams.entries()].sort()).toString();

  return new Request(cacheUrl.toString(), { method: "GET" });
}

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

  if (url.pathname === "/thumbnail") {
    const width = parseInt(url.searchParams.get("w")) || 128;
    const height = parseInt(url.searchParams.get("h")) || 128;
    const quality = parseInt(url.searchParams.get("q")) || 80;
    const format = url.searchParams.get("format") || "jpeg";
    const fit = url.searchParams.get("fit") || "cover";

    const cache = caches.default;
    const cacheKey = await buildCacheKey(url, token);

    const cached = await cache.match(cacheKey);
    if (cached) {
      const h = new Headers(cached.headers);
      h.set("X-Thumbnail-Status", "edge-cache-hit");
      return new Response(cached.body, { status: cached.status, headers: h });
    }

    try {
      const inputRes = await fetch(target, fetchOptions);
      if (!inputRes.ok) {
        return json({ error: "Failed to fetch source image", status: inputRes.status }, inputRes.status);
      }

      const inputBytes = await inputRes.arrayBuffer();
      const raw = new Uint8Array(inputBytes);
      const inputFmt = detectFormat(raw);

      const isSmallJpeg = inputFmt === "jpeg" && inputBytes.byteLength < 2 * 1024 * 1024;

      let result = null;

      if (isSmallJpeg) {
        try {
          const processed = await processImage(inputBytes, { width, height, quality, format, fit });
          result = { ...processed, status: "processed-edge" };
        } catch (procErr) {
          console.error("Local processing failed, falling back to Supabase:", procErr.message);
        }
      }

      if (!result) {
        const supabaseParams = new URLSearchParams(url.searchParams);
        supabaseParams.delete("token");
        const supabaseUrl = `${SUPABASE_THUMBNAIL_URL}?${supabaseParams.toString()}`;

        const supabaseHeaders = { "User-Agent": USER_AGENT };
        if (token) {
          supabaseHeaders["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        }

        const supabaseRes = await fetch(supabaseUrl, { headers: supabaseHeaders, redirect: "follow" });
        if (!supabaseRes.ok) {
          const errBody = await supabaseRes.text().catch(() => "");
          console.error(`[thumbnail] Supabase resizer failed (${supabaseRes.status}): ${errBody}`);
          return json({ error: "Thumbnail conversion failed upstream", status: supabaseRes.status }, 502);
        }

        const bytes = new Uint8Array(await supabaseRes.arrayBuffer());
        result = {
          bytes,
          contentType: supabaseRes.headers.get("Content-Type") || "image/webp",
          status: "processed-supabase",
        };
      }

      const h = new Headers();
      h.set("Content-Type", result.contentType);
      h.set("Content-Length", String(result.bytes.length));
      h.set("Cache-Control", "public, max-age=31536000, immutable");
      h.set("Access-Control-Allow-Origin", "*");
      h.set("X-Thumbnail-Status", result.status);

      const response = new Response(result.bytes, { headers: h });

      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    } catch (err) {
      return json({ error: "Failed to fetch source", message: err.message }, 502);
    }
  }

  try {
    const res = await fetch(target, fetchOptions);
    const h = new Headers(res.headers);
    h.set("Access-Control-Allow-Origin", "*");
    h.delete("Set-Cookie");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  } catch (err) {
    return json({ error: "Failed to fetch thumbnail", message: err.message }, 502);
  }
}
