import { getTableName, isTable, sql } from 'drizzle-orm';

import { db } from '@/instance/drizzle';

import * as schema from '@/schemas';

export const getAllTablesName = () => {
  return Object.values(schema)
    .filter((table) => isTable(table))
    .map((table) => getTableName(table));
};

export const setupTestDatabase = async (): Promise<void> => {
  await resetTables();
};

export const teardownTestDatabase = async (): Promise<void> => {
  await resetTables();
};

export const resetTables = async (tables: readonly string[] = getAllTablesName()): Promise<void> => {
  await db.transaction(async (tx) => {
    for (const table of tables) {
      await tx.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
    }
  });
};

export const insertUser = async (data: typeof schema.user.$inferInsert): Promise<typeof schema.user.$inferSelect> => {
  const [result] = await db.insert(schema.user).values(data).returning();
  return result;
};

export const insertSession = async (
  data: typeof schema.session.$inferInsert,
): Promise<typeof schema.session.$inferSelect> => {
  const [result] = await db.insert(schema.session).values(data).returning();
  return result;
};

export const insertAccount = async (
  data: typeof schema.account.$inferInsert,
): Promise<typeof schema.account.$inferSelect> => {
  const [result] = await db.insert(schema.account).values(data).returning();
  return result;
};
