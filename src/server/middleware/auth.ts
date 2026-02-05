import { config } from "../../config.ts";

function extractToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Fall back to cookie
  const cookies = request.headers.get("cookie");
  if (!cookies) return null;

  for (const part of cookies.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === config.auth.cookieName) {
      return rest.join("=");
    }
  }

  return null;
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // Bun provides timingSafeEqual on the crypto module
  const { timingSafeEqual } = require("node:crypto");
  return timingSafeEqual(bufA, bufB);
}

export function isAuthenticated(request: Request): boolean {
  const configToken = config.auth.token;
  if (!configToken) return false;

  const requestToken = extractToken(request);
  if (!requestToken) return false;

  return timingSafeCompare(requestToken, configToken);
}

export function requireAuth(
  request: Request,
  set: { status?: number | string }
): { error: string } | null {
  if (!isAuthenticated(request)) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  return null;
}
