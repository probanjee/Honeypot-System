import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// PostgreSQL Connection Pool using node-postgres (pg)
// Provides typed query execution, transactions, and connection lifecycle management.
// ---------------------------------------------------------------------------

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL || undefined,
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: env.DB_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error({ err }, '[PostgreSQL Pool Error] Unexpected idle client error');
});

/**
 * Execute a parameterized SQL query against the PostgreSQL pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rowCount: res.rowCount }, '[PostgreSQL Query]');
    return res;
  } catch (error: any) {
    logger.error({ text, params, error: error.message }, '[PostgreSQL Query Error]');
    throw error;
  }
}

/**
 * Execute a block of operations within an isolated SQL transaction.
 */
export async function withTransaction<T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test connectivity to the database.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const res = await query('SELECT 1 as healthy');
    return res.rows.length > 0 && res.rows[0].healthy === 1;
  } catch (err) {
    return false;
  }
}
