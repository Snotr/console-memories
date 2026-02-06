import { Elysia, t } from "elysia";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import type { Article, Reactions } from "../../shared/types.ts";
import { config } from "../../config.ts";
import { articlesRepository } from "../db/articles.repository.ts";
import { reactionsRepository } from "../db/reactions.repository.ts";
import { viewsRepository } from "../db/views.repository.ts";
import { requireAuth } from "../middleware/auth.ts";

// Helper: Extract cm_visitor cookie value
function getVisitorId(request: Request): string | null {
  const cookies = request.headers.get("cookie");
  if (!cookies) return null;
  for (const part of cookies.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "cm_visitor") return rest.join("=");
  }
  return null;
}

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

// YouTube video ID: exactly 11 alphanumeric, hyphen, or underscore characters
const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

// Match standalone YouTube URLs on their own line (not inside markdown links)
// Captures: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID,
//           youtube.com/shorts/ID, youtube.com/live/ID, m.youtube.com/...
const YOUTUBE_URL_LINE_RE =
  /^(?!\s*\[.*\]\()(?:https?:\/\/)?(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})(?:[&?][\w=&%.+-]*)?$/gm;

// Helper: Convert standalone YouTube URLs into embed placeholders
function convertYouTubeUrls(markdown: string): string {
  return markdown.replace(YOUTUBE_URL_LINE_RE, (_match, videoId: string) => {
    if (!YOUTUBE_VIDEO_ID_RE.test(videoId)) return _match;
    return `<div class="youtube-embed" data-video-id="${videoId}"></div>`;
  });
}

// Configure DOMPurify - allow safe HTML elements including images/videos
const sanitizeConfig = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "strong", "em", "b", "i", "u", "s", "del",
    "a", "img", "video", "source",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span", "figure", "figcaption",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class",
    "target", "rel", "width", "height",
    "controls", "autoplay", "loop", "muted", "poster",
    "type", // for video source
    "data-video-id", // for YouTube embed placeholders
  ],
  // Force safe link behavior
  ADD_ATTR: ["target", "rel"],
  // Allow our uploads and external https images
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/uploads\/|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

// Constants for input validation (from config)
const MAX_TITLE_LENGTH = config.security.maxTitleLength;
const MAX_CONTENT_LENGTH = config.security.maxContentLength;

// Helper: Generate unique slug
function generateSlug(title: string, existingId?: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Check for uniqueness
  let slug = baseSlug;
  let counter = 1;

  while (articlesRepository.slugExists(slug, existingId || "")) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Helper: Generate excerpt from markdown
function generateExcerpt(markdown: string): string {
  const plainText = markdown
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // Remove images
    .replace(/\n+/g, " ")
    .trim();

  if (plainText.length <= 150) return plainText;
  return plainText.substring(0, 150).replace(/\s+\S*$/, "") + "...";
}

// Helper: Convert sanitised YouTube-embed placeholders into actual iframes.
// Runs AFTER DOMPurify so user-provided iframes are still stripped while our
// embeds come through safely.
function embedYouTubeIframes(html: string): string {
  return html.replace(
    /<div class="youtube-embed" data-video-id="([a-zA-Z0-9_-]{11})"><\/div>/g,
    (_, videoId: string) =>
      `<div class="youtube-embed"><div class="youtube-embed__wrapper">` +
      `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}" ` +
      `title="YouTube video" allowfullscreen ` +
      `sandbox="allow-scripts allow-same-origin allow-presentation" ` +
      `loading="lazy" ` +
      `style="position:absolute;top:0;left:0;width:100%;height:100%;border:none">` +
      `</iframe></div></div>`,
  );
}

// Helper: Compile markdown to HTML (with sanitization)
function compileMarkdown(content: string): string {
  const withEmbeds = convertYouTubeUrls(content);
  const rawHtml = marked.parse(withEmbeds) as string;
  const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
  return embedYouTubeIframes(cleanHtml);
}

// Helper: Validate and clean text input
function validateText(text: string, maxLength: number): string {
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return cleaned.slice(0, maxLength);
}

export const articleRoutes = new Elysia({ prefix: "/api/articles" })
  // GET /api/articles - List all articles
  .get("/", () => {
    return articlesRepository.getAll();
  })

  // GET /api/articles/:slug - Get single article by slug
  .get("/:slug", ({ params, request, set }) => {
    const article = articlesRepository.getBySlug(params.slug);
    if (!article) {
      set.status = 404;
      return { error: "Article not found" };
    }
    // Ensure legacy articles get YouTube iframes (previously stored as placeholders only)
    if (article.contentHtml && !article.contentHtml.includes("<iframe")) {
      article.contentHtml = embedYouTubeIframes(article.contentHtml);
    }
    // Record unique view
    const visitorId = getVisitorId(request);
    if (visitorId) {
      viewsRepository.recordView(visitorId, article.id);
      article.views = viewsRepository.getViewCount(article.id);
    }
    return article;
  })

  // POST /api/articles - Create new article
  .post(
    "/",
    ({ body, request, set }) => {
      const authError = requireAuth(request, set);
      if (authError) return authError;

      const title = validateText(body.title, MAX_TITLE_LENGTH);
      const content = validateText(body.content, MAX_CONTENT_LENGTH);

      if (!title || !content) {
        set.status = 400;
        return { error: "Title and content are required" };
      }

      const id = crypto.randomUUID();
      const slug = generateSlug(title);
      const contentHtml = compileMarkdown(content);
      const excerpt = generateExcerpt(content);

      const article = articlesRepository.create({
        id,
        slug,
        title,
        content,
        contentHtml,
        excerpt,
        featured: body.featured ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      set.status = 201;
      return article;
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: MAX_TITLE_LENGTH }),
        content: t.String({ minLength: 1, maxLength: MAX_CONTENT_LENGTH }),
        featured: t.Optional(t.Boolean()),
      }),
    }
  )

  // PUT /api/articles/:id - Update article by ID
  .put(
    "/:id",
    ({ params, body, request, set }) => {
      const authError = requireAuth(request, set);
      if (authError) return authError;

      const existing = articlesRepository.getById(params.id);
      if (!existing) {
        set.status = 404;
        return { error: "Article not found" };
      }

      const newTitle = body.title
        ? validateText(body.title, MAX_TITLE_LENGTH)
        : existing.title;
      const newContent = body.content
        ? validateText(body.content, MAX_CONTENT_LENGTH)
        : existing.content;

      if (body.title && !newTitle) {
        set.status = 400;
        return { error: "Title cannot be empty" };
      }
      if (body.content && !newContent) {
        set.status = 400;
        return { error: "Content cannot be empty" };
      }

      const newSlug = body.title ? generateSlug(newTitle, params.id) : existing.slug;

      const updated = articlesRepository.update(params.id, {
        title: newTitle,
        slug: newSlug,
        content: newContent,
        contentHtml: body.content ? compileMarkdown(newContent) : undefined,
        excerpt: body.content ? generateExcerpt(newContent) : undefined,
        featured: body.featured,
      });

      return updated;
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: MAX_TITLE_LENGTH })),
        content: t.Optional(t.String({ minLength: 1, maxLength: MAX_CONTENT_LENGTH })),
        featured: t.Optional(t.Boolean()),
      }),
    }
  )

  // DELETE /api/articles/:id - Delete article by ID
  .delete("/:id", ({ params, request, set }) => {
    const authError = requireAuth(request, set);
    if (authError) return authError;

    const deleted = articlesRepository.delete(params.id);
    if (!deleted) {
      set.status = 404;
      return { error: "Article not found" };
    }
    set.status = 204;
    return null;
  })

  // POST /api/articles/:id/reactions - Add reaction (idempotent per visitor)
  .post(
    "/:id/reactions",
    ({ params, body, request, set }) => {
      const reaction = body.type as keyof Reactions;
      if (!["fire", "heart", "thinking", "clap"].includes(reaction)) {
        set.status = 400;
        return { error: "Invalid reaction type" };
      }

      const visitorId = getVisitorId(request);

      // Check idempotency if visitor cookie exists
      if (visitorId && reactionsRepository.hasReacted(visitorId, params.id, reaction)) {
        const reactions = articlesRepository.getReactions(params.id);
        return { reactions, alreadyReacted: true };
      }

      const reactions = articlesRepository.addReaction(params.id, reaction);
      if (!reactions) {
        set.status = 404;
        return { error: "Article not found" };
      }

      // Log the reaction for this visitor
      if (visitorId) {
        reactionsRepository.logReaction(visitorId, params.id, reaction);
      }

      return { reactions, alreadyReacted: false };
    },
    {
      body: t.Object({
        type: t.String(),
      }),
    }
  )

  // GET /api/articles/reactions/:articleId/me - Get visitor's reactions for article
  .get("/reactions/:articleId/me", ({ params, request }) => {
    const visitorId = getVisitorId(request);
    if (!visitorId) {
      return { reacted: [] };
    }
    const reacted = reactionsRepository.getVisitorReactions(visitorId, params.articleId);
    return { reacted };
  });
