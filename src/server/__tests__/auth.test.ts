import { describe, test, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoutes } from "../routes/auth.ts";
import { runMigrations } from "../db/connection.ts";

const app = new Elysia().use(authRoutes);

beforeAll(() => {
  runMigrations();
});

describe("Auth API", () => {
  describe("POST /api/auth/login", () => {
    test("authenticates with valid token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "test-token" }),
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.authenticated).toBe(true);

      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain("cm_auth=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
    });

    test("rejects invalid token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "wrong-token" }),
        })
      );

      expect(res.status).toBe(401);
    });

    test("rejects empty token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "" }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/auth/logout", () => {
    test("clears auth cookie", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/logout", {
          method: "POST",
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.authenticated).toBe(false);

      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain("Max-Age=0");
    });
  });

  describe("GET /api/auth/status", () => {
    test("returns unauthenticated without token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/status")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.authenticated).toBe(false);
    });

    test("returns authenticated with valid bearer token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/status", {
          headers: { Authorization: "Bearer test-token" },
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.authenticated).toBe(true);
    });
  });
});
