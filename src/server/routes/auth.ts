import { Elysia, t } from "elysia";
import { timingSafeEqual } from "node:crypto";
import { config } from "../../config.ts";
import { isAuthenticated } from "../middleware/auth.ts";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  // POST /api/auth/login - verify token & set cookie
  .post(
    "/login",
    ({ body, set }) => {
      const configToken = config.auth.token;
      if (!configToken) {
        set.status = 503;
        return { error: "Authentication not configured" };
      }

      const token = body.token;
      const encoder = new TextEncoder();

      // Timing-safe comparison
      if (token.length !== configToken.length) {
        set.status = 401;
        return { error: "Invalid token" };
      }

      const a = encoder.encode(token);
      const b = encoder.encode(configToken);

      if (!timingSafeEqual(a, b)) {
        set.status = 401;
        return { error: "Invalid token" };
      }

      const secure = config.isProd ? "; Secure" : "";
      set.headers["Set-Cookie"] =
        `${config.auth.cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${config.auth.cookieMaxAge}${secure}`;

      return { authenticated: true };
    },
    {
      body: t.Object({
        token: t.String({ minLength: 1 }),
      }),
    }
  )

  // POST /api/auth/logout - clear cookie
  .post("/logout", ({ set }) => {
    const secure = config.isProd ? "; Secure" : "";
    set.headers["Set-Cookie"] =
      `${config.auth.cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
    return { authenticated: false };
  })

  // GET /api/auth/status - check if request is authenticated
  .get("/status", ({ request }) => {
    return { authenticated: isAuthenticated(request) };
  });
