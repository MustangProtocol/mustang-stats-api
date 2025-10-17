import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mustang_stats';

let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

/**
 * Get Drizzle database instance
 * Creates connection on first call and reuses it
 */
export function getDb() {
  if (!db) {
    client = postgres(DATABASE_URL);
    db = drizzle({ client, schema });
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

/**
 * Get the raw postgres client for migrations or advanced operations
 */
export function getClient() {
  if (!client) {
    client = postgres(DATABASE_URL);
  }
  return client;
}
