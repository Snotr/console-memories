import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { articleRoutes } from "./routes/articles.ts";
import { pageRoutes } from "./routes/pages.ts";
import { mediaRoutes } from "./routes/media.ts";
import { authRoutes } from "./routes/auth.ts";
import { config, validateConfig } from "../config.ts";
import { runMigrations } from "./db/connection.ts";
import { mkdirSync } from "fs";
import { dirname } from "path";
import index from "../client/index.html";

// Validate config on startup
validateConfig();

// Ensure data directories exist
mkdirSync(dirname(config.paths.database), { recursive: true });
mkdirSync(config.paths.uploads, { recursive: true });

// Initialize database and run migrations
runMigrations();

// Security headers
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "frame-ancestors 'none'",
  ].join("; "),
};

// Configure CORS based on environment
const corsConfig = config.cors.enabled
  ? { origin: config.cors.origin, credentials: true }
  : { origin: false, credentials: true };

const api = new Elysia()
  .onRequest(({ request, set }) => {
    // Apply security headers to all requests
    for (const [key, value] of Object.entries(securityHeaders)) {
      set.headers[key] = value;
    }

    // Ensure cm_visitor cookie exists for reaction idempotency
    const cookies = request.headers.get("cookie") || "";
    const hasVisitor = cookies.split(";").some((c) => c.trim().startsWith(`${config.visitor.cookieName}=`));
    if (!hasVisitor) {
      const visitorId = crypto.randomUUID();
      const secure = config.isProd ? "; Secure" : "";
      set.headers["Set-Cookie"] =
        `${config.visitor.cookieName}=${visitorId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.visitor.cookieMaxAge}${secure}`;
    }
  })
  .use(cors(corsConfig))
  .use(articleRoutes)
  .use(pageRoutes)
  .use(mediaRoutes)
  .use(authRoutes);

// Serve uploaded files statically
const serveUploads = async (req: Request): Promise<Response | null> => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/uploads/")) {
    const filename = url.pathname.replace("/uploads/", "");
    const file = Bun.file(`${config.paths.uploads}/${filename}`);

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Content-Type": file.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  }
  return null;
};

Bun.serve({
  port: config.server.port,
  hostname: config.server.host,
  maxRequestBodySize: config.security.maxBodySize,
  routes: {
    "/": index,
    "/about": index,
    "/new": index,
    "/edit/*": index,
    "/article/*": index,
    "/login": index,
  },
  fetch: async (req) => {
    // Check for uploads first
    const uploadResponse = await serveUploads(req);
    if (uploadResponse) return uploadResponse;

    // Then handle API routes
    return api.fetch(req);
  },
  development: config.isDev
    ? {
        hmr: true,
        console: true,
      }
    : undefined,
});

// Startup message
const url = `http://${config.server.host}:${config.server.port}`;
console.log(`
┌─────────────────────────────────────┐
│   Console Memories                  │
│   Running at ${url.padEnd(22)}│
│   Environment: ${config.env.padEnd(18)}│
└─────────────────────────────────────┘
`);
