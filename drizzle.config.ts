import { defineConfig } from 'drizzle-kit';

import { loadEnv } from '@/util/load-env.server';
import { EnvSchema } from '@/util/schemas/env';

loadEnv();

// Only the database URL: migrations run without the app's other settings (the test runners, the Vercel build).
const { DATABASE_URL } = EnvSchema.pick({ DATABASE_URL: true }).parse(process.env);

export default defineConfig({
  schema: './src/schemas/index.ts',
  dialect: 'postgresql',
  dbCredentials: { url: DATABASE_URL },
});
