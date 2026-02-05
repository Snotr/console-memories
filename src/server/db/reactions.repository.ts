import { eq, and } from "drizzle-orm";
import { db } from "./connection.ts";
import { reactionLogs } from "./schema.ts";
import type { Reactions } from "../../shared/types.ts";

export const reactionsRepository = {
  hasReacted(visitorId: string, articleId: string, type: keyof Reactions): boolean {
    const row = db
      .select({ id: reactionLogs.id })
      .from(reactionLogs)
      .where(
        and(
          eq(reactionLogs.visitorId, visitorId),
          eq(reactionLogs.articleId, articleId),
          eq(reactionLogs.reactionType, type)
        )
      )
      .get();
    return row !== undefined;
  },

  logReaction(visitorId: string, articleId: string, type: keyof Reactions): void {
    db.insert(reactionLogs)
      .values({
        visitorId,
        articleId,
        reactionType: type,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .run();
  },

  getVisitorReactions(visitorId: string, articleId: string): string[] {
    const rows = db
      .select({ type: reactionLogs.reactionType })
      .from(reactionLogs)
      .where(
        and(
          eq(reactionLogs.visitorId, visitorId),
          eq(reactionLogs.articleId, articleId)
        )
      )
      .all();
    return rows.map((r) => r.type);
  },
};
