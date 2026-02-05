import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    content: text("content").notNull(),
    contentHtml: text("content_html").notNull(),
    excerpt: text("excerpt").notNull(),
    featured: integer("featured").default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_articles_slug").on(table.slug),
    index("idx_articles_featured").on(table.featured),
    index("idx_articles_created").on(table.createdAt),
  ]
);

export const reactions = sqliteTable(
  "reactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["fire", "heart", "thinking", "clap"] }).notNull(),
    count: integer("count").default(0),
  },
  (table) => [
    uniqueIndex("reactions_article_id_type_unique").on(table.articleId, table.type),
    index("idx_reactions_article").on(table.articleId),
  ]
);

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  createdAt: text("created_at").notNull(),
});
