import { createE2eRunner } from '@wesven/testing/e2e-runner';

import { server } from '@/mock/node';

createE2eRunner({
  mswServer: server,
  resetTables: async () => {
    const { resetTables } = await import('@/util/db');
    await resetTables();
  },
}).parse();
