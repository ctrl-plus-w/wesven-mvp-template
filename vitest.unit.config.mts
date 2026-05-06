import { unitConfig } from '@wesven/testing/vitest-config';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(unitConfig, {
  test: { setupFiles: ['./tests/setup/vitest-unit.setup.ts'] },
});
