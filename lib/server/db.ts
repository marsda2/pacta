import { Pool, type QueryResult, type QueryResultRow } from 'pg';

// Conexión directa a Postgres con el rol pacta_app (solo esquema pacta), por el pooler de
// Supabase (puerto 6543). Un pool de 1 conexión por instancia serverless.
let pool: Pool | undefined;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

export function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}

export type Queryable = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<QueryResult<T>>;

// Ejecuta `fn` dentro de una transacción; si lanza, hace rollback.
export async function withTransaction<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn((text, params = []) => client.query(text, params));
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
