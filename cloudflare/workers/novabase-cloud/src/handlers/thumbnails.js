import { HF_API, DEFAULT_BRANCH, USER_AGENT } from "../config.js";
import { json } from "../utils/response.js";
import { processImage, detectFormat } from "../utils/image.js";

export async function handleThumbnails(request, url, auth) {
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

    try {
      const inputRes = await fetch(target, fetchOptions);
      if (!inputRes.ok) {
        return json({ error: "Failed to fetch source image", status: inputRes.status }, inputRes.status);
      }

      const inputBytes = await inputRes.arrayBuffer();
      const raw = new Uint8Array(inputBytes);
      const inputFmt = detectFormat(raw);

      // CPU Limit Safety: Only attempt to resize small JPEGs.
      // Cloudflare Workers Free Tier has a very low CPU limit (10ms).
      // Resizing images larger than 2MB often exceeds this.
      const isSmallJpeg = inputFmt === "jpeg" && inputBytes.byteLength < 2 * 1024 * 1024;

      if (isSmallJpeg) {
        try {
          const { bytes, contentType } = await processImage(inputBytes, {
            width,
            height,
            quality,
            format,
            fit
          });
          const h = new Headers();
          h.set("Content-Type", contentType);
          h.set("Content-Length", String(bytes.length));
          h.set("Cache-Control", "public, max-age=31536000, immutable");
          h.set("Access-Control-Allow-Origin", "*");
          h.set("X-Thumbnail-Status", "processed");
          return new Response(bytes, { headers: h });
        } catch (procErr) {
          console.error("Processing failed:", procErr.message);
          // Fallback handled below
        }
      }

      // Large File Offloading: Proxy to Supabase resizer (not redirect) so we can pass
      // the token via Authorization header instead of URL — avoids URL length limits from JWTs.
      const supabaseParams = new URLSearchParams(url.searchParams);
      supabaseParams.delete('token');
      const supabaseUrl = `https://lehfwzwfferrgjrfwiot.supabase.co/functions/v1/thumbnail-resizer?${supabaseParams.toString()}`;
      console.log(`[thumbnail] Offloading large/unsupported image to Supabase: ${inputBytes.byteLength} bytes`);
      
      const supabaseHeaders = { 'User-Agent': USER_AGENT };
      if (token) {
        supabaseHeaders['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
      
      const supabaseRes = await fetch(supabaseUrl, {
        headers: supabaseHeaders,
        redirect: 'follow',
      });
      
      return new Response(supabaseRes.body, {
        status: supabaseRes.status,
        headers: supabaseRes.headers,
      });

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
