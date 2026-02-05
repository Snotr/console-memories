import { eq, desc } from "drizzle-orm";
import { db } from "./connection.ts";
import { media } from "./schema.ts";

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
}

function rowToMedia(row: typeof media.$inferSelect): MediaFile {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    path: row.path,
    createdAt: new Date(row.createdAt),
  };
}

export const mediaRepository = {
  create(mediaFile: Omit<MediaFile, "createdAt">): MediaFile {
    const now = new Date();

    db.insert(media)
      .values({
        id: mediaFile.id,
        filename: mediaFile.filename,
        originalName: mediaFile.originalName,
        mimeType: mediaFile.mimeType,
        size: mediaFile.size,
        path: mediaFile.path,
        createdAt: now.toISOString(),
      })
      .run();

    return { ...mediaFile, createdAt: now };
  },

  getById(id: string): MediaFile | null {
    const row = db.select().from(media).where(eq(media.id, id)).get();
    return row ? rowToMedia(row) : null;
  },

  getByFilename(filename: string): MediaFile | null {
    const row = db
      .select()
      .from(media)
      .where(eq(media.filename, filename))
      .get();
    return row ? rowToMedia(row) : null;
  },

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    db.delete(media).where(eq(media.id, id)).run();
    return true;
  },

  getAll(): MediaFile[] {
    const rows = db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))
      .all();
    return rows.map(rowToMedia);
  },
};
