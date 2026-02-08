import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'tests/cypress/support/e2e.ts',
    specPattern: 'tests/cypress/e2e/**/*.cy.ts',
    setupNodeEvents(on) {
      on('task', {
        async resetDb() {
          const { resetTables } = await import('./src/utils/db');
          await resetTables();
          return null;
        },
      });
    },
  },
});
