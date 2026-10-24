// ---------------------------------------------------------------------------
// Database client re-exports.
// All database access goes through this single module.
// ---------------------------------------------------------------------------

export { pool, query, withTransaction, checkDatabaseHealth } from './pool';
