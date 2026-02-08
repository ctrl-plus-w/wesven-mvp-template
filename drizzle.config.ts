import { defineConfig } from 'drizzle-kit';

import ENV from '@/env';

export default defineConfig({
  schema: './src/schemas/index.ts',
  dialect: 'postgresql',
  dbCredentials: { url: ENV.DATABASE_URL },
});
