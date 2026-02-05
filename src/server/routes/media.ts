import { Elysia, t } from "elysia";
import { mediaRepository } from "../db/media.repository.ts";
import { config } from "../../config.ts";
import { join } from "path";

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Upload directory from config
const UPLOAD_DIR = config.paths.uploads;

// Helper: Validate file type
function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

// Helper: Get max size for type
function getMaxSize(mimeType: string): number {
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    return MAX_VIDEO_SIZE;
  }
  return MAX_IMAGE_SIZE;
}

export const mediaRoutes = new Elysia({ prefix: "/api/media" })
  // Upload file
  .post(
    "/upload",
    async ({ body, set }) => {
      const file = body.file;

      // Validate file type
      if (!isAllowedType(file.type)) {
        set.status = 400;
        return {
          error: "Invalid file type",
          allowed: ALLOWED_TYPES,
        };
      }

      // Validate file size
      const maxSize = getMaxSize(file.type);
      if (file.size > maxSize) {
        set.status = 400;
        return {
          error: "File too large",
          maxSize: maxSize,
          maxSizeMB: maxSize / (1024 * 1024),
        };
      }

      // Generate UUID filename with original extension
      const ext = file.name.split(".").pop() || "";
      const sanitizedExt = ext.replace(/[^a-zA-Z0-9]/g, "");
      const filename = `${crypto.randomUUID()}.${sanitizedExt}`;
      const filePath = join(UPLOAD_DIR, filename);

      try {
        // Save file to disk
        const arrayBuffer = await file.arrayBuffer();
        await Bun.write(filePath, arrayBuffer);

        // Save to database
        const id = crypto.randomUUID();
        // Sanitize original filename (strip path traversal)
        const safeOriginalName = file.name.replace(/[/\\]/g, "_");
        const media = mediaRepository.create({
          id,
          filename,
          originalName: safeOriginalName,
          mimeType: file.type,
          size: file.size,
          path: filePath,
        });

        set.status = 201;
        return {
          id: media.id,
          filename: media.filename,
          url: `/uploads/${media.filename}`,
          mimeType: media.mimeType,
          size: media.size,
        };
      } catch (error) {
        set.status = 500;
        return { error: "Failed to save file" };
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )

  // Get file info
  .get("/:id", ({ params, set }) => {
    const media = mediaRepository.getById(params.id);

    if (!media) {
      set.status = 404;
      return { error: "File not found" };
    }

    return {
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      url: `/uploads/${media.filename}`,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt,
    };
  })

  // Delete file
  .delete("/:id", async ({ params, set }) => {
    const media = mediaRepository.getById(params.id);

    if (!media) {
      set.status = 404;
      return { error: "File not found" };
    }

    try {
      // Delete file from disk
      const { unlink } = await import("fs/promises");
      try {
        await unlink(media.path);
      } catch {
        // File may already be deleted, continue
      }

      // Delete from database
      mediaRepository.delete(params.id);

      set.status = 204;
      return null;
    } catch (error) {
      set.status = 500;
      return { error: "Failed to delete file" };
    }
  })

  // List all media
  .get("/", () => {
    const files = mediaRepository.getAll();
    return files.map((media) => ({
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      url: `/uploads/${media.filename}`,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt,
    }));
  });
