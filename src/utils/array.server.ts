import { and, type Column, eq, inArray } from 'drizzle-orm';
import type { PgInsertValue, PgTable } from 'drizzle-orm/pg-core';

import { db } from '@/instance/drizzle';

import { toArray } from '@/util/array.client';

export type DiffSyncResult<TAdded, TUpdated = TAdded, TRemoved = TAdded> = {
  added: TAdded[];
  updated: TUpdated[];
  removed: TRemoved[];
};

/**
 * Executes a callback within an existing transaction or creates a new one
 * @param tx - An existing transaction instance, or undefined to create a new one
 * @param callback - The callback to execute within the transaction
 */
export const useTransaction = <T>(tx: typeof db | undefined, callback: (tx: typeof db) => Promise<T>) => {
  if (tx) return callback(tx);
  return db.transaction(callback);
};

/**
 * Creates a function that synchronizes database records by applying added, updated, and removed changes
 * @param table - The database table to synchronize
 * @param idColumnOrColumns - The column(s) used as identifier for matching records
 * @param getId - A function that extracts the identifier value(s) from an entity
 * @param tx - An optional existing transaction instance
 */
export const diffSyncHelper = <TTable extends PgTable, TColumn extends Column | Column[]>(
  table: TTable,
  idColumnOrColumns: TColumn,
  getId: (entity: TTable['$inferSelect']) => TColumn extends any[] ? string[] : string,
  tx?: typeof db,
) => {
  return async ({ added, updated, removed }: DiffSyncResult<PgInsertValue<TTable>>) => {
    const removedId = removed.map((entity) => toArray(getId(entity)));

    const idColumns = toArray(idColumnOrColumns);

    return useTransaction(tx, async (tx): Promise<DiffSyncResult<TTable['$inferSelect']>> => {
      const addedReq = added.length ? tx.insert(table).values(added).returning() : Promise.resolve([]);

      const where = and(
        ...idColumns.map((column, i) =>
          inArray(
            column,
            removedId.map((ids) => ids[i]),
          ),
        ),
      );

      const removedReq = removedId.length ? tx.delete(table).where(where).returning() : Promise.resolve([]);

      const updatedReq = updated.map((entity) =>
        tx
          .update(table)
          .set(entity)
          .where(and(...idColumns.map((column, i) => eq(column, toArray(getId(entity))[i]))))
          .returning(),
      );

      const [addedRes, updatedRes, removedRes] = await Promise.all([
        addedReq,
        await Promise.all(updatedReq),
        removedReq,
      ]);

      return {
        added: addedRes,
        removed: removedRes,
        updated: updatedRes.map((arr) => arr[0]),
      };
    });
  };
};
