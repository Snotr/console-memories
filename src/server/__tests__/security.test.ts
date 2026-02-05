import { describe, test, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";

// Set test environment before importing routes
process.env.DATABASE_PATH = ":memory:";
process.env.AUTH_TOKEN = "test-token";

const authHeaders = {
  "Content-Type": "application/json",
  Authorization: "Bearer test-token",
};

const { articleRoutes } = await import("../routes/articles.ts");
const { runMigrations } = await import("../db/connection.ts");

const app = new Elysia().use(articleRoutes);

beforeAll(() => {
  runMigrations();
});

describe("Security - XSS Prevention", () => {
  test("removes script tags from markdown", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Script",
          content: "# Hello\n\n<script>alert('XSS')</script>\n\nSafe text",
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("<script>");
    expect(data.contentHtml).not.toContain("alert");
    expect(data.contentHtml).toContain("<h1>Hello</h1>");
    expect(data.contentHtml).toContain("Safe text");
  });

  test("removes onerror handlers from images", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Img",
          content: '<img src="x" onerror="alert(1)">',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("onerror");
    expect(data.contentHtml).not.toContain("alert");
  });

  test("removes onclick handlers", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Click",
          content: '<button onclick="alert(1)">Click</button>',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("onclick");
    expect(data.contentHtml).not.toContain("alert");
  });

  test("removes javascript: URLs from links", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Link",
          content: '[Click me](javascript:alert(1))',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("javascript:");
  });

  test("removes javascript: URLs from anchor tags", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Anchor",
          content: '<a href="javascript:alert(1)">Bad link</a>',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("javascript:");
  });

  test("removes iframe tags", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Iframe",
          content: '<iframe src="https://evil.com"></iframe>',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("<iframe");
  });

  test("removes style tags with expressions", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test Style",
          content: '<style>body { background: url("javascript:alert(1)") }</style>',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("<style");
  });

  test("removes svg with onload", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "XSS Test SVG",
          content: '<svg onload="alert(1)"></svg>',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).not.toContain("onload");
  });

  test("preserves safe HTML elements", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "Safe HTML Test",
          content: `# Heading

**Bold** and *italic* text.

- List item 1
- List item 2

> Blockquote

\`inline code\`

\`\`\`
code block
\`\`\`

[Safe link](https://example.com)`,
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).toContain("<h1>Heading</h1>");
    expect(data.contentHtml).toContain("<strong>Bold</strong>");
    expect(data.contentHtml).toContain("<em>italic</em>");
    expect(data.contentHtml).toContain("<li>");
    expect(data.contentHtml).toContain("<blockquote>");
    expect(data.contentHtml).toContain("<code>");
    expect(data.contentHtml).toContain("<pre>");
    expect(data.contentHtml).toContain('href="https://example.com"');
  });

  test("allows images from uploads", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "Image Upload Test",
          content: '![My image](/uploads/test-image.jpg)',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).toContain('src="/uploads/test-image.jpg"');
  });

  test("allows https images", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "External Image Test",
          content: '![External](https://example.com/image.jpg)',
        }),
      })
    );
    const data = await res.json();

    expect(data.contentHtml).toContain('src="https://example.com/image.jpg"');
  });
});

describe("Security - Input Validation", () => {
  test("strips control characters from title", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "Title\x00with\x1Fcontrol\x7Fchars",
          content: "Content",
        }),
      })
    );
    const data = await res.json();

    expect(data.title).not.toContain("\x00");
    expect(data.title).not.toContain("\x1F");
    expect(data.title).not.toContain("\x7F");
    expect(data.title).toContain("Title");
    expect(data.title).toContain("with");
    expect(data.title).toContain("control");
    expect(data.title).toContain("chars");
  });

  test("enforces title max length", async () => {
    const longTitle = "A".repeat(300);

    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: longTitle,
          content: "Content",
        }),
      })
    );

    expect(res.status === 422 || res.status === 201).toBe(true);

    if (res.status === 201) {
      const data = await res.json();
      expect(data.title.length).toBeLessThanOrEqual(200);
    }
  });

  test("trims whitespace from title", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "  Trimmed Title  ",
          content: "Content",
        }),
      })
    );
    const data = await res.json();

    expect(data.title).toBe("Trimmed Title");
  });
});
