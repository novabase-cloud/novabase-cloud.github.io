export function extractToken(request, url) {
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
