import { Elysia } from "elysia";
import { config } from "../../config.ts";

export const pageRoutes = new Elysia({ prefix: "/api" })
  .get("/profile", () => ({
    name: config.profile.name,
    bio: config.profile.bio,
    avatar: config.profile.avatar || undefined,
    socials: config.profile.socials,
  }))
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.env,
  }));
