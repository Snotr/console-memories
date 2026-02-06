import { eq, and, sql } from "drizzle-orm";
import { db } from "./connection.ts";
import { articleViews, viewLogs } from "./schema.ts";

export const viewsRepository = {
  getViewCount(articleId: string): number {
    const row = db
      .select({ count: articleViews.count })
      .from(articleViews)
      .where(eq(articleViews.articleId, articleId))
      .get();
    return row?.count ?? 0;
  },

  hasViewed(visitorId: string, articleId: string): boolean {
    const row = db
      .select({ id: viewLogs.id })
      .from(viewLogs)
      .where(
        and(
          eq(viewLogs.visitorId, visitorId),
          eq(viewLogs.articleId, articleId)
        )
      )
      .get();
    return row !== undefined;
  },

  recordView(visitorId: string, articleId: string): void {
    // Only increment if this is a new unique view
    if (this.hasViewed(visitorId, articleId)) return;

    // Log the view for deduplication
    db.insert(viewLogs)
      .values({
        visitorId,
        articleId,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .run();

    // Increment aggregate count
    db.insert(articleViews)
      .values({ articleId, count: 1 })
      .onConflictDoUpdate({
        target: [articleViews.articleId],
        set: { count: sql`${articleViews.count} + 1` },
      })
      .run();
  },

  initializeViews(articleId: string): void {
    db.insert(articleViews)
      .values({ articleId, count: 0 })
      .onConflictDoNothing()
      .run();
  },
};
