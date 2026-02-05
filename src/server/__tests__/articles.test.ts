import { describe, test, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";

// Set test database before importing routes
process.env.DATABASE_PATH = ":memory:";

// Now import after setting env
const { articleRoutes } = await import("../routes/articles.ts");
const { runMigrations } = await import("../db/connection.ts");

const app = new Elysia().use(articleRoutes);

beforeAll(() => {
  runMigrations();
});

describe("Articles API", () => {
  describe("GET /api/articles", () => {
    test("returns array of articles", async () => {
      const res = await app.handle(new Request("http://localhost/api/articles"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("articles in list do not include full content", async () => {
      // First create an article
      await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "List Test Article",
            content: "# Content\n\nFull content here.",
          }),
        })
      );

      const res = await app.handle(new Request("http://localhost/api/articles"));
      const data = await res.json();

      if (data.length > 0) {
        expect(data[0]).not.toHaveProperty("content");
        expect(data[0]).not.toHaveProperty("contentHtml");
        expect(data[0]).toHaveProperty("excerpt");
      }
    });

    test("featured articles come first", async () => {
      // Create non-featured article
      await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Non Featured",
            content: "Content",
            featured: false,
          }),
        })
      );

      // Create featured article
      await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Featured Article",
            content: "Content",
            featured: true,
          }),
        })
      );

      const res = await app.handle(new Request("http://localhost/api/articles"));
      const data = await res.json();

      const featuredIndices = data
        .map((a: { featured: boolean }, i: number) => (a.featured ? i : -1))
        .filter((i: number) => i !== -1);
      const nonFeaturedIndices = data
        .map((a: { featured: boolean }, i: number) => (!a.featured ? i : -1))
        .filter((i: number) => i !== -1);

      if (featuredIndices.length > 0 && nonFeaturedIndices.length > 0) {
        const maxFeatured = Math.max(...featuredIndices);
        const minNonFeatured = Math.min(...nonFeaturedIndices);
        expect(maxFeatured).toBeLessThan(minNonFeatured);
      }
    });
  });

  describe("POST /api/articles", () => {
    test("creates article with valid data", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Test Article Create",
            content: "# Test\n\nThis is a test.",
          }),
        })
      );
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.title).toBe("Test Article Create");
      expect(data.slug).toMatch(/^test-article-create/);
      expect(data.contentHtml).toContain("<h1>Test</h1>");
      expect(data.id).toBeDefined();
    });

    test("rejects empty title", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "",
            content: "Some content",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("rejects empty content", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Title",
            content: "",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("generates unique slugs for duplicate titles", async () => {
      const res1 = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Duplicate Title Test",
            content: "Content 1",
          }),
        })
      );
      const data1 = await res1.json();

      const res2 = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Duplicate Title Test",
            content: "Content 2",
          }),
        })
      );
      const data2 = await res2.json();

      expect(data1.slug).not.toBe(data2.slug);
    });
  });

  describe("GET /api/articles/:slug", () => {
    test("returns article with full content", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Full Content Test",
            content: "# Full\n\nThis is the full content.",
          }),
        })
      );
      const created = await createRes.json();

      const res = await app.handle(
        new Request(`http://localhost/api/articles/${created.slug}`)
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.content).toBe("# Full\n\nThis is the full content.");
      expect(data.contentHtml).toContain("<h1>Full</h1>");
    });

    test("returns 404 for non-existent slug", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/articles/non-existent-slug-12345")
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/articles/:id", () => {
    test("deletes existing article", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "To Delete Test",
            content: "Will be deleted.",
          }),
        })
      );
      const created = await createRes.json();

      const deleteRes = await app.handle(
        new Request(`http://localhost/api/articles/${created.id}`, {
          method: "DELETE",
        })
      );

      expect(deleteRes.status).toBe(204);

      const getRes = await app.handle(
        new Request(`http://localhost/api/articles/${created.slug}`)
      );
      expect(getRes.status).toBe(404);
    });

    test("returns 404 for non-existent id", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/articles/non-existent-id", {
          method: "DELETE",
        })
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/articles/:id", () => {
    test("updates article title and regenerates slug", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Original Title Update",
            content: "Original content.",
          }),
        })
      );
      const created = await createRes.json();

      const updateRes = await app.handle(
        new Request(`http://localhost/api/articles/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Updated Title Here",
          }),
        })
      );
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.title).toBe("Updated Title Here");
      expect(updated.slug).toMatch(/^updated-title-here/);
      expect(updated.content).toBe("Original content.");
    });

    test("updates featured status", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Feature Test Article",
            content: "Content",
            featured: false,
          }),
        })
      );
      const created = await createRes.json();
      expect(created.featured).toBe(false);

      const updateRes = await app.handle(
        new Request(`http://localhost/api/articles/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featured: true,
          }),
        })
      );
      const updated = await updateRes.json();

      expect(updated.featured).toBe(true);
    });
  });

  describe("POST /api/articles/:id/reactions", () => {
    test("increments reaction count", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Reaction Test Article",
            content: "Content",
          }),
        })
      );
      const created = await createRes.json();
      const initialFire = created.reactions.fire;

      const reactionRes = await app.handle(
        new Request(`http://localhost/api/articles/${created.id}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "fire" }),
        })
      );
      const data = await reactionRes.json();

      expect(reactionRes.status).toBe(200);
      expect(data.reactions.fire).toBe(initialFire + 1);
    });

    test("rejects invalid reaction type", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Invalid Reaction Test Article",
            content: "Content",
          }),
        })
      );
      const created = await createRes.json();

      const res = await app.handle(
        new Request(`http://localhost/api/articles/${created.id}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "invalid" }),
        })
      );

      expect(res.status).toBe(400);
    });
  });
});
