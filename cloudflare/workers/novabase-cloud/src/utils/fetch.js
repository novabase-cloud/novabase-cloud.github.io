import { USER_AGENT } from "../config.js";

export async function fetchJson(url, auth) {
  try {
    const res = await fetch(url, { 
      headers: { 
        "Authorization": auth, 
        "User-Agent": USER_AGENT,
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
