import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/schema/index';

import ENV from '@/env';

// Fix for "sorry, too many clients already"
declare global {
  // eslint-disable-next-line no-var -- only var works here
  var db: PostgresJsDatabase<typeof schema> | undefined;
}

// biome-ignore lint/suspicious/noRedeclare: shadows the `global.db` declaration above to cache the client across hot reloads
let db: PostgresJsDatabase<typeof schema>;

if (ENV.NODE_ENV === 'production') {
  db = drizzle(postgres(ENV.DATABASE_URL, { onnotice: () => null }), {
    schema,
    logger: true,
  });
} else {
  if (!global.db) global.db = drizzle(postgres(ENV.DATABASE_URL, { onnotice: () => null }), { schema });

  db = global.db;
}

export { db };
