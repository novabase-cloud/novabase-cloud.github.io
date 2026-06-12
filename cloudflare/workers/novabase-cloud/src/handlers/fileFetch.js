import { HF_API, DEFAULT_BRANCH, USER_AGENT } from "../config.js";
import { json } from "../utils/response.js";

export async function handleFileFetch(path, url, auth) {
  const repo = url.searchParams.get("repo");
  const type = url.searchParams.get("type") || "dataset";
  if (!repo) return json({ error: "Missing repo parameter" }, 400);

  const baseUrl = type === "dataset" ? `${HF_API}/datasets/${repo}` : `${HF_API}/${repo}`;
  const fileUrl = `${baseUrl}/resolve/${DEFAULT_BRANCH}/${path}`;

  try {
    const res = await fetch(fileUrl, {
      headers: { "Authorization": auth, "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.delete("Set-Cookie");

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
