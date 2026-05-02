import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "./config.js";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(here, "..", "supabase", "schema.sql");

function getDbConnectionSummary() {
  const url = new URL(env.supabaseDbUrl);
  return {
    protocol: url.protocol.replace(":", ""),
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, "") || "(missing)",
    username: url.username || "(missing)",
    passwordPresent: Boolean(url.password),
    passwordLooksPlaceholder:
      /\[.*\]/.test(url.password) ||
      /your-password/i.test(url.password) ||
      /changeme/i.test(url.password),
  };
}

export async function ensureSchema(): Promise<void> {
  try {
    const connection = getDbConnectionSummary();
    console.log("[bootstrap] ensuring schema with DB config:", connection);

    try {
      const resolved = await lookup(connection.host);
      console.log(`[bootstrap] DB host resolved: ${connection.host} -> ${resolved.address}`);
    } catch (error) {
      console.error(`[bootstrap] DB host lookup failed for ${connection.host}:`, error);
      throw error;
    }

    const sql = await readFile(SCHEMA_PATH, "utf8");
    const client = new pg.Client({ connectionString: env.supabaseDbUrl });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("[bootstrap] schema ensure failed:", error);
    throw error;
  }
}
