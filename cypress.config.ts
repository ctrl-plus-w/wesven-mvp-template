import { defineE2EConfig } from '@wesven/testing/cypress-config';
import { defineConfig } from 'cypress';

import { resetTables } from './src/utils/db';

const config = defineE2EConfig({ resetTables });

export default defineConfig({
  ...config,
  e2e: {
    ...config.e2e,
    // A cold production build on a CI runner answers its first requests slowly; the defaults (4s, 60s) flake there.
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 120000,
  },
  // Retried in `cypress run` only, so a flaky spec still fails locally where it can be fixed.
  retries: { runMode: 2, openMode: 0 },
});
