import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Singleton on globalThis — same HMR-survival pattern as tokenStore; also
// avoids piling up open sqlite handles across dev hot reloads.
const g = globalThis as unknown as {
  __shortstayDb?: BetterSQLite3Database<typeof schema>;
};

function createDb(): BetterSQLite3Database<typeof schema> {
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "shortstay.db"));
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export const db = (g.__shortstayDb ??= createDb());
