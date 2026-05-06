import { createIntegrationRunner } from '@wesven/testing/integration-runner';

createIntegrationRunner({
  resetTables: async () => {
    const { resetTables } = await import('@/util/db');
    await resetTables();
  },
}).parse();
