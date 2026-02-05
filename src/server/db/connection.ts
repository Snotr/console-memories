import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { config } from "../../config.ts";
import * as schema from "./schema.ts";

const dbPath = config.paths.database;

const sqlite = new Database(dbPath, { create: true });

// Enable WAL mode for better performance
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function runMigrations(): void {
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database initialized at:", dbPath);
}

// Close database on process exit
process.on("exit", () => {
  sqlite.close();
});
