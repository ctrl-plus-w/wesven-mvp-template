import { sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import pgTsquery from 'pg-tsquery';

const { Tsquery } = pgTsquery;

import { db } from '@/instance/drizzle';

import { toArray } from '@/util/array.client';

export type PgColumnOrColumns = PgColumn | PgColumn[];

/**
 * Concatenates multiple PostgreSQL columns with a space separator for text search
 * @param columnOrColumns - A single column or array of columns to concatenate
 */
export const concatColumns = (columnOrColumns: PgColumnOrColumns) => {
  return sql.join(
    toArray(columnOrColumns).map((c) => sql`${c}`),
    sql` || ' ' || `,
  );
};

/**
 * Computes ts_rank for full-text search ranking
 * @param columnOrColumns - A single column or array of columns to rank against
 * @param search - The search string to rank by
 */
export const getRank = (columnOrColumns: PgColumnOrColumns, search: string) => {
  return sql`ts_rank(to_tsvector('simple', ${concatColumns(columnOrColumns)}), plainto_tsquery('simple', ${search}))`.as(
    'rank',
  );
};

/**
 * Creates a tsvector similarity condition for full-text search filtering
 * @param columnOrColumns - A single column or array of columns to search in
 * @param search - The search string to match against
 */
export const getVectorSimilarityCondition = (columnOrColumns: PgColumnOrColumns, search: string) => {
  return sql`to_tsvector('simple', ${concatColumns(columnOrColumns)}) @@ plainto_tsquery('simple', ${search})`;
};

/**
 * Returns COUNT of the column, or 1 if the count is 0 (useful to avoid division by zero)
 * @param column - The column to count
 */
export const countOr1 = (column: PgColumn) => {
  return sql`CASE WHEN COUNT(${column}) = 0 THEN 1 ELSE COUNT(${column}) END`;
};

/**
 * Format a search string to be used with PostgreSQL's tsquery
 * @param search The search string to format
 * @returns The formatted search string ready for tsquery
 */
export const formatSearch = (search: string) => {
  const tsQuery = new Tsquery();
  return tsQuery.parseAndStringify(search);
};

/**
 * Reset all tables in the public schema by truncating them
 */
export const resetTables = async () => {
  const query = sql<string>`SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `;

  const tables = await db.execute<{ table_name: string }>(query);

  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${table.table_name}" CASCADE;`));
  }
};
