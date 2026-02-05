import { eq, desc, and, ne, sql } from "drizzle-orm";
import { db } from "./connection.ts";
import { articles, reactions } from "./schema.ts";
import type { Article, Reactions } from "../../shared/types.ts";

// Helper: Convert DB row to Article type
function rowToArticle(
  row: typeof articles.$inferSelect,
  reactionData: Reactions
): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    featured: row.featured === 1,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    reactions: reactionData,
  };
}

// Helper: Get reactions for article
function getReactionsForArticle(articleId: string): Reactions {
  const rows = db
    .select({ type: reactions.type, count: reactions.count })
    .from(reactions)
    .where(eq(reactions.articleId, articleId))
    .all();

  const result: Reactions = { fire: 0, heart: 0, thinking: 0, clap: 0 };

  for (const row of rows) {
    if (row.type in result) {
      result[row.type as keyof Reactions] = row.count ?? 0;
    }
  }

  return result;
}

// Helper: Initialize reactions for new article
function initializeReactions(articleId: string): void {
  const types: (keyof Reactions)[] = ["fire", "heart", "thinking", "clap"];
  for (const type of types) {
    db.insert(reactions)
      .values({ articleId, type, count: 0 })
      .onConflictDoNothing()
      .run();
  }
}

// Repository functions
export const articlesRepository = {
  // Expose getReactions publicly
  getReactions(articleId: string): Reactions {
    return getReactionsForArticle(articleId);
  },

  // Get all articles (without full content)
  getAll(): Omit<Article, "content" | "contentHtml">[] {
    const rows = db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featured: articles.featured,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .orderBy(desc(articles.featured), desc(articles.createdAt))
      .all();

    return rows.map((row) => {
      const reactionData = getReactionsForArticle(row.id);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        featured: row.featured === 1,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        reactions: reactionData,
      };
    });
  },

  // Get single article by slug
  getBySlug(slug: string): Article | null {
    const row = db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .get();

    if (!row) return null;

    const reactionData = getReactionsForArticle(row.id);
    return rowToArticle(row, reactionData);
  },

  // Get single article by ID
  getById(id: string): Article | null {
    const row = db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .get();

    if (!row) return null;

    const reactionData = getReactionsForArticle(row.id);
    return rowToArticle(row, reactionData);
  },

  // Check if slug exists (excluding given ID)
  slugExists(slug: string, excludeId: string = ""): boolean {
    const row = db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.slug, slug), ne(articles.id, excludeId)))
      .get();

    return row !== undefined;
  },

  // Create new article
  create(article: Omit<Article, "reactions">): Article {
    const now = new Date().toISOString();

    db.insert(articles)
      .values({
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        contentHtml: article.contentHtml,
        excerpt: article.excerpt,
        featured: article.featured ? 1 : 0,
        createdAt: article.createdAt.toISOString(),
        updatedAt: now,
      })
      .run();

    // Initialize reactions
    initializeReactions(article.id);

    return {
      ...article,
      reactions: { fire: 0, heart: 0, thinking: 0, clap: 0 },
    };
  },

  // Update article
  update(
    id: string,
    updates: Partial<
      Pick<Article, "title" | "slug" | "content" | "contentHtml" | "excerpt" | "featured">
    >
  ): Article | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();

    db.update(articles)
      .set({
        title: updates.title ?? existing.title,
        slug: updates.slug ?? existing.slug,
        content: updates.content ?? existing.content,
        contentHtml: updates.contentHtml ?? existing.contentHtml,
        excerpt: updates.excerpt ?? existing.excerpt,
        featured: (updates.featured ?? existing.featured) ? 1 : 0,
        updatedAt: now,
      })
      .where(eq(articles.id, id))
      .run();

    return this.getById(id);
  },

  // Delete article
  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    db.delete(articles).where(eq(articles.id, id)).run();
    return true;
  },

  // Add reaction
  addReaction(articleId: string, type: keyof Reactions): Reactions | null {
    const article = this.getById(articleId);
    if (!article) return null;

    db.insert(reactions)
      .values({ articleId, type, count: 1 })
      .onConflictDoUpdate({
        target: [reactions.articleId, reactions.type],
        set: { count: sql`${reactions.count} + 1` },
      })
      .run();

    return getReactionsForArticle(articleId);
  },
};
