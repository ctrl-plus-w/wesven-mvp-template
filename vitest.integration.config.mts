import { integrationConfig } from '@wesven/testing/vitest-config';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(integrationConfig, {
  test: { setupFiles: ['./tests/setup/vitest-integration.setup.ts'] },
});
