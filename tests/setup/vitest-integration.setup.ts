import { setupIntegrationTests } from '@wesven/testing/vitest-setup';

import { server } from '@/mock/node';
import { resetTables, setupTestDatabase, teardownTestDatabase } from '@/test-util/db';

setupIntegrationTests({
  server,
  db: { setup: setupTestDatabase, teardown: teardownTestDatabase, reset: resetTables },
});
