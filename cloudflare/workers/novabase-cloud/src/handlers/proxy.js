import { HF_API, USER_AGENT } from "../config.js";
import { json } from "../utils/response.js";

export async function handleProxy(request, url, auth) {
  const targetUrl = new URL(url.pathname, HF_API);
  url.searchParams.forEach((value, key) => {
    if (key !== "token") targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  
  // Forward relevant headers from the client request
  const headersToForward = [
    "Accept",
    "Accept-Encoding",
    "Accept-Language",
    "Cache-Control",
    "Content-Type",
    "Range",
    "If-None-Match",
    "If-Modified-Since",
    "X-Requested-With",
  ];

  for (const name of headersToForward) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Override with required headers
  headers.set("Authorization", auth);
  headers.set("User-Agent", request.headers.get("User-Agent") || USER_AGENT);

  try {
    const res = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    const h = new Headers(res.headers);
    h.set("Access-Control-Allow-Origin", "*");
    h.delete("Set-Cookie");
    
    // Some headers from HF might cause issues when proxied
    h.delete("Content-Security-Policy");
    h.delete("X-Frame-Options");

    return new Response(res.body, { 
      status: res.status, 
      statusText: res.statusText, 
      headers: h 
    });
  } catch (err) {
    return json({ error: "Routing Error", message: err.message }, 502);
  }
}
