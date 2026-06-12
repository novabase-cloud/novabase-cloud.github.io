import { HF_API, USER_AGENT } from "../config.js";
import { json } from "../utils/response.js";

export async function handleProxy(request, url, auth) {
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
        "User-Agent": USER_AGENT,
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
}
