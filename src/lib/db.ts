import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:cambusascout.db");
  }
  return dbPromise;
}

export async function select<T>(query: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(query, params);
}

export async function execute(query: string, params: unknown[] = []): Promise<{ lastInsertId: number; rowsAffected: number }> {
  const db = await getDb();
  const result = await db.execute(query, params);
  return { lastInsertId: result.lastInsertId ?? 0, rowsAffected: result.rowsAffected };
}
