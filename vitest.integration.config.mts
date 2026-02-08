import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest-integration.setup.ts'],
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    globals: true,

    testTimeout: 30000,
    hookTimeout: 30000,

    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
