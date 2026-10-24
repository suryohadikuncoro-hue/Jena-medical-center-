import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };
let instance: ReturnType<typeof drizzle<typeof fullSchema>> | undefined;
let activeConnectionString = "";

export function configureDatabase(connectionString: string) {
  if (connectionString && connectionString !== activeConnectionString) {
    activeConnectionString = connectionString;
    instance = undefined;
  }
}

export function getDb() {
  const connectionString = activeConnectionString || env.databaseUrl;
  if (!connectionString) throw new Error("Database connection is not configured");
  if (!instance) {
    const client = postgres(connectionString, {
      prepare: false,
      max: 5,
      fetch_types: false,
      ssl: connectionString.includes("supabase.co") ? "require" : undefined,
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
