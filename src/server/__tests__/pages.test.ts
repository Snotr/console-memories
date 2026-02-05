import { describe, test, expect } from "bun:test";
import { Elysia } from "elysia";
import { pageRoutes } from "../routes/pages.ts";

const app = new Elysia().use(pageRoutes);

describe("Pages API", () => {
  describe("GET /api/health", () => {
    test("returns status ok", async () => {
      const res = await app.handle(new Request("http://localhost/api/health"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBeDefined();
    });

    test("timestamp is valid ISO string", async () => {
      const res = await app.handle(new Request("http://localhost/api/health"));
      const data = await res.json();

      const date = new Date(data.timestamp);
      expect(date.toString()).not.toBe("Invalid Date");
    });
  });

  describe("GET /api/profile", () => {
    test("returns profile data", async () => {
      const res = await app.handle(new Request("http://localhost/api/profile"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBeDefined();
      expect(data.bio).toBeDefined();
      expect(Array.isArray(data.socials)).toBe(true);
    });

    test("socials have required fields", async () => {
      const res = await app.handle(new Request("http://localhost/api/profile"));
      const data = await res.json();

      for (const social of data.socials) {
        expect(social.name).toBeDefined();
        expect(social.url).toBeDefined();
      }
    });
  });
});
