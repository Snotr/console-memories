/**
 * Application Configuration
 *
 * All configuration is loaded from environment variables.
 * Bun automatically loads .env files, no dotenv needed.
 *
 * Required env vars for production:
 * - None currently (all have defaults)
 *
 * Optional env vars:
 * - PORT: Server port (default: 3000)
 * - HOST: Server host (default: localhost)
 * - NODE_ENV: Environment (development | production | test)
 * - CORS_ORIGIN: Allowed CORS origin (default: same-origin only)
 * - LOG_LEVEL: Logging level (default: info)
 *
 * Profile configuration:
 * - PROFILE_NAME: Blog owner name
 * - PROFILE_BIO: Blog owner bio
 * - SOCIAL_GITHUB: GitHub URL
 * - SOCIAL_TELEGRAM: Telegram URL
 * - SOCIAL_TWITTER: Twitter/X URL
 * - SOCIAL_EMAIL: Email address
 */

import type { SocialLink } from "./shared/types.ts";

// Environment helpers
const env = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? Bun.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? defaultValue!;
};

const envInt = (key: string, defaultValue: number): number => {
  const value = env(key, String(defaultValue));
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for environment variable ${key}: ${value}`);
  }
  return parsed;
};

const envBool = (key: string, defaultValue: boolean): boolean => {
  const value = env(key, String(defaultValue));
  return value === "true" || value === "1";
};

// Build social links from env vars
function buildSocialLinks(): SocialLink[] {
  const links: SocialLink[] = [];

  const github = env("SOCIAL_GITHUB", "");
  if (github) links.push({ name: "GitHub", url: github, icon: "github" });

  const telegram = env("SOCIAL_TELEGRAM", "");
  if (telegram) links.push({ name: "Telegram", url: telegram, icon: "telegram" });

  const twitter = env("SOCIAL_TWITTER", "");
  if (twitter) links.push({ name: "Twitter", url: twitter, icon: "twitter" });

  const email = env("SOCIAL_EMAIL", "");
  if (email) links.push({ name: "Email", url: `mailto:${email}`, icon: "email" });

  // Default links if none configured
  if (links.length === 0) {
    links.push(
      { name: "GitHub", url: "https://github.com", icon: "github" },
      { name: "Telegram", url: "https://t.me", icon: "telegram" }
    );
  }

  return links;
}

// Configuration object
export const config = {
  // Server
  server: {
    port: envInt("PORT", 3000),
    host: env("HOST", "localhost"),
  },

  // Environment
  env: env("NODE_ENV", "development") as "development" | "production" | "test",
  isDev: env("NODE_ENV", "development") === "development",
  isProd: env("NODE_ENV", "development") === "production",
  isTest: env("NODE_ENV", "development") === "test",

  // CORS
  cors: {
    origin: env("CORS_ORIGIN", ""),
    enabled: envBool("CORS_ENABLED", false),
  },

  // Logging
  logLevel: env("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",

  // Profile (for About page)
  profile: {
    name: env("PROFILE_NAME", "Console Memories"),
    bio: env("PROFILE_BIO", "A minimal blog with a terminal aesthetic. Thoughts, code, and memories."),
    avatar: env("PROFILE_AVATAR", ""),
    socials: buildSocialLinks(),
  },

  // Security
  security: {
    // Max content lengths
    maxTitleLength: envInt("MAX_TITLE_LENGTH", 200),
    maxContentLength: envInt("MAX_CONTENT_LENGTH", 100000),
  },

  // Paths (configurable via env vars for deployment)
  paths: {
    database: env("DATABASE_PATH", "./data/console-memories.db"),
    uploads: env("UPLOAD_DIR", "./uploads"),
  },
} as const;

// Validate configuration on startup
export function validateConfig(): void {
  // Add any required validation here
  if (config.isProd) {
    // Production-specific validations
    if (!config.cors.origin && config.cors.enabled) {
      console.warn("Warning: CORS is enabled but no origin is set");
    }
  }
}

// Export type for use in other files
export type Config = typeof config;
