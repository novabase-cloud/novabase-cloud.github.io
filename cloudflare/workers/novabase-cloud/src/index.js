import { corsHeaders } from "./utils/cors.js";
import { json } from "./utils/response.js";
import { extractToken } from "./utils/auth.js";
import { handleRepos } from "./handlers/repos.js";
import { handleListing } from "./handlers/listing.js";
import { handleFileFetch } from "./handlers/fileFetch.js";
import { handleThumbnails } from "./handlers/thumbnails.js";
import { handleProxy } from "./handlers/proxy.js";

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
        message: "Missing or invalid Bearer token. Please login with Hugging Face.",
        debug: {
          path: url.pathname,
          method: request.method,
          hasTokenParam: url.searchParams.has("token"),
          hasAuthHeader: !!request.headers.get("Authorization")
        }
      }, 401);
    }

    // Router
    if (url.pathname === "/_/repos") {
      return handleRepos(auth);
    }

    if (url.pathname === "/api/whoami-v2" || url.pathname === "/oauth/userinfo") {
      return handleProxy(request, url, auth);
    }

    if (url.pathname === "/thumbnail" || url.pathname === "/video-thumbnail") {
      return handleThumbnails(request, url, auth);
    }

    if (url.searchParams.has("repo")) {
      const isListing = url.pathname === "/" || url.searchParams.has("page") || url.searchParams.has("limit");
      if (isListing) {
        return handleListing(url, auth);
      }
      const path = url.pathname.replace(/^\//, "");
      return handleFileFetch(path, url, auth);
    }

    return handleProxy(request, url, auth);
  },
};
