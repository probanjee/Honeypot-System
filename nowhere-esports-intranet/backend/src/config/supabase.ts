import { pool, query } from '../database/pool';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Native PostgreSQL Query Adapter
// Drops in seamlessly for repositories that expect fluent query-building syntax,
// converting operations directly into parameterized PostgreSQL SQL queries.
// ---------------------------------------------------------------------------

export interface QueryResultObject<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

export class PostgresQueryBuilder<T = any> implements PromiseLike<QueryResultObject<T>> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectCols: string = '*';
  private countMode: string | null = null;
  private insertValues: any = null;
  private updateValues: any = null;
  private whereClauses: string[] = [];
  private params: any[] = [];
  private paramIdx: number = 1;
  private orderByClause: string | null = null;
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.action = 'select';
    this.selectCols = columns === '' ? '*' : columns;
    if (options?.count) {
      this.countMode = options.count;
    }
    return this;
  }

  insert(values: any | any[]): this {
    this.action = 'insert';
    this.insertValues = values;
    return this;
  }

  update(values: any): this {
    this.action = 'update';
    this.updateValues = values;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.whereClauses.push(`${column} = $${this.paramIdx++}`);
    this.params.push(value);
    return this;
  }

  neq(column: string, value: any): this {
    this.whereClauses.push(`${column} != $${this.paramIdx++}`);
    this.params.push(value);
    return this;
  }

  gt(column: string, value: any): this {
    this.whereClauses.push(`${column} > $${this.paramIdx++}`);
    this.params.push(value);
    return this;
  }

  gte(column: string, value: any): this {
    this.whereClauses.push(`${column} >= $${this.paramIdx++}`);
    this.params.push(value);
    return this;
  }

  lt(column: string, value: any): this {
    this.whereClauses.push(`${column} < $${this.paramIdx++}`);
    this.params.push(value);
    return this;
  }

  lte(column: string, value: any): this {
    this.whereClauses.push(`${column} <= $${this.paramIdx++}`);
    this.params.push(value);
    return this;
  }

  in(column: string, values: any[]): this {
    if (!values || values.length === 0) {
      this.whereClauses.push('FALSE');
      return this;
    }
    const placeholders = values.map(() => `$${this.paramIdx++}`).join(', ');
    this.whereClauses.push(`${column} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.whereClauses.push(`${column} IS NULL`);
    } else {
      this.whereClauses.push(`${column} = $${this.paramIdx++}`);
      this.params.push(value);
    }
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.whereClauses.push(`${column} ILIKE $${this.paramIdx++}`);
    this.params.push(pattern);
    return this;
  }

  like(column: string, pattern: string): this {
    this.whereClauses.push(`${column} LIKE $${this.paramIdx++}`);
    this.params.push(pattern);
    return this;
  }

  or(filterString: string): this {
    // Parses expressions like: "actor_id.eq.123,target_id.eq.123" or "email.ilike.%q%,first_name.ilike.%q%"
    const conditions = filterString.split(',').map((part) => {
      const match = part.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z]+)\.(.*)$/);
      if (!match) return null;
      const [, col, op, val] = match;
      const idx = this.paramIdx++;
      if (op === 'eq') {
        this.params.push(val);
        return `${col} = $${idx}`;
      } else if (op === 'ilike') {
        this.params.push(val);
        return `${col} ILIKE $${idx}`;
      } else if (op === 'like') {
        this.params.push(val);
        return `${col} LIKE $${idx}`;
      } else if (op === 'neq') {
        this.params.push(val);
        return `${col} != $${idx}`;
      }
      this.params.push(val);
      return `${col} = $${idx}`;
    }).filter(Boolean);

    if (conditions.length > 0) {
      this.whereClauses.push(`(${conditions.join(' OR ')})`);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const dir = options?.ascending === false ? 'DESC' : 'ASC';
    const nulls = options?.nullsFirst === true ? ' NULLS FIRST' : (options?.nullsFirst === false ? ' NULLS LAST' : '');
    this.orderByClause = `ORDER BY ${column} ${dir}${nulls}`;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single(): this {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle(): this {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  async execute(): Promise<QueryResultObject<T>> {
    try {
      let sql = '';
      const params = [...this.params];
      let exactCount: number | null = null;

      const where = this.whereClauses.length > 0 ? `WHERE ${this.whereClauses.join(' AND ')}` : '';

      // Count if requested
      if (this.countMode === 'exact') {
        const countSql = `SELECT COUNT(*) as count FROM ${this.table} ${where}`;
        const countRes = await query(countSql, params);
        exactCount = parseInt(countRes.rows[0]?.count || '0', 10);
      }

      if (this.action === 'select') {
        sql = `SELECT ${this.selectCols} FROM ${this.table} ${where}`;
        if (this.orderByClause) sql += ` ${this.orderByClause}`;
        if (this.limitCount !== null) sql += ` LIMIT ${this.limitCount}`;
        if (this.offsetCount !== null) sql += ` OFFSET ${this.offsetCount}`;

        const res = await query(sql, params);

        if (this.isSingle) {
          if (res.rows.length === 0) {
            return { data: null, error: { message: 'Row not found' }, count: exactCount };
          }
          return { data: res.rows[0], error: null, count: exactCount };
        }

        if (this.isMaybeSingle) {
          return { data: res.rows[0] ?? null, error: null, count: exactCount };
        }

        return { data: res.rows as any, error: null, count: exactCount };
      }

      if (this.action === 'insert') {
        const items = Array.isArray(this.insertValues) ? this.insertValues : [this.insertValues];
        if (items.length === 0) return { data: [] as any, error: null };

        const cols = Object.keys(items[0]);
        const valPlaceholders: string[] = [];

        items.forEach((item) => {
          const rowP: string[] = [];
          cols.forEach((col) => {
            rowP.push(`$${this.paramIdx++}`);
            params.push(item[col]);
          });
          valPlaceholders.push(`(${rowP.join(', ')})`);
        });

        sql = `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES ${valPlaceholders.join(', ')} RETURNING *`;
        const res = await query(sql, params);

        if (this.isSingle || !Array.isArray(this.insertValues)) {
          return { data: res.rows[0] ?? null, error: null };
        }
        return { data: res.rows as any, error: null };
      }

      if (this.action === 'update') {
        const cols = Object.keys(this.updateValues);
        if (cols.length === 0) {
          return { data: null, error: null };
        }

        const setAssignments = cols.map((col) => {
          const idx = this.paramIdx++;
          params.push(this.updateValues[col]);
          return `${col} = $${idx}`;
        });

        sql = `UPDATE ${this.table} SET ${setAssignments.join(', ')} ${where} RETURNING *`;
        const res = await query(sql, params);

        if (this.isSingle || this.isMaybeSingle) {
          return { data: res.rows[0] ?? null, error: null };
        }
        return { data: res.rows as any, error: null };
      }

      if (this.action === 'delete') {
        sql = `DELETE FROM ${this.table} ${where} RETURNING *`;
        const res = await query(sql, params);
        return { data: res.rows as any, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      logger.error({ err: err.message, table: this.table, action: this.action }, 'PostgreSQL Query execution error');
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  then<TResult1 = QueryResultObject<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResultObject<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export class PostgresClientAdapter {
  from<T = any>(table: string): PostgresQueryBuilder<T> {
    return new PostgresQueryBuilder<T>(table);
  }

  async rpc(funcName: string, params: Record<string, any> = {}): Promise<{ data: any; error: any }> {
    try {
      const keys = Object.keys(params);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `SELECT * FROM ${funcName}(${placeholders})`;
      const res = await query(sql, Object.values(params));
      return { data: res.rows, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

export const supabaseAdmin = new PostgresClientAdapter();
export const supabaseUser = new PostgresClientAdapter();
