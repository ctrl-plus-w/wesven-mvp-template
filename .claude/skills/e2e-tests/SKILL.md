---
name: e2e-tests
description: E2E testing conventions and patterns for this codebase. Use when writing, reviewing, or debugging E2E tests with Cypress and database seeding.
---

# End-to-End Tests

This document covers best practices and conventions for E2E testing in this codebase.

## Framework & Configuration

- **Framework**: Cypress 15.x
- **Config file**: `cypress.config.ts`
- **Support file**: `tests/cypress/support/e2e.ts`
- **Spec pattern**: `tests/cypress/e2e/**/*.cy.{ts,tsx}`
- **Base URL**: `http://localhost:3000`
- **Run command**: `pnpm test:e2e` (headless) or `pnpm test:e2e --open` (interactive UI)
- **Skip build**: `pnpm test:e2e --skip-build` (reuse previous build)
- **Environment variables**: `cypress.env.json` (copy from `cypress.env.example.json`)
- **App environment**: `.env.test` (loaded automatically when `NODE_ENV=test`)

## Folder Structure

```
tests/
├── cypress/
│   ├── e2e/                             # Spec files
│   ├── plugins/
│   │   └── register-tsconfig-paths.ts   # Resolves @/ path aliases in Cypress
│   └── support/
│       ├── commands.ts                  # Custom Cypress commands (cy.login, cy.shopLogin)
│       ├── constants.ts                 # Typed viewport + test user constants
│       └── e2e.ts                       # Type declarations + command imports
├── fixtures/                            # Shared test fixtures (Pennylane API mocks)
│   └── pennylane/api/
│       ├── customers.json
│       └── products.json
├── seeds/                               # Database seed functions
│   └── shop.seed.ts
├── factories/                           # Data factories for test entities
├── mocks/                               # MSW handlers
└── utils/                               # Test utility functions (db-test-utils)
```

## Path Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `@/fixture/*` | `tests/fixtures/*` | Pennylane API mock JSONs |
| `@/seed/*` | `tests/seeds/*` | Database seed functions |
| `@/e2e-support/*` | `tests/cypress/support/*` | Constants, types for E2E specs |
| `@/factory/*` | `tests/factories/*` | Data factories |
| `@/test-util/*` | `tests/utils/*` | Test utilities (db-test-utils) |
| `@/mock/*` | `tests/mocks/*` | MSW handlers |

## Test File Naming

Test files use a numbered naming convention to enforce execution order:

| Pattern                           | Example                                            |
| --------------------------------- | -------------------------------------------------- |
| `N-feature/N.M-description.cy.ts` | `1-authentication/1.1-global-authentication.cy.ts` |

- **N**: Feature group number (1 = authentication, 2 = shop, etc.)
- **N.M**: Sub-feature number within the group
- **Description**: Kebab-case feature name

## Test Runner Architecture

The E2E runner (`src/scripts/e2e-runner.ts`) orchestrates the full test lifecycle using Listr2 for parallel task management:

### Setup Phase (parallel)

1. **Database environment** (sequential):
   - Start Docker container (`docker compose -f compose.test.yaml up --detach --wait`)
   - Run migrations (`pnpm drizzle:migrate`)
   - Reset all tables (`TRUNCATE CASCADE`)

2. **Application environment** (sequential):
   - Build the Next.js app (`pnpm build`) — skipped with `--skip-build`
   - Start the app (`pnpm start`) and wait for `tcp:3000`

3. **External API mock**:
   - Start MSW server with shared handlers

### Execution Phase

- Run Cypress in headless mode (`test:e2e`)

### Cleanup Phase (always runs)

- Kill the web application process
- Stop Docker containers (`docker compose -f compose.test.yaml down`)
- Close MSW server

> DO NOT RUN E2E COMMANDS OUTSIDE OF THEIR CONTEXT. ALWAYS USE `pnpm run test:e2e`

## Test Structure

Use `describe`/`context`/`it` nesting with `before` for one-time DB setup and `beforeEach` for per-test configuration:

```typescript
import { TEST_USERS, VIEWPORTS } from '@/e2e-support/constants';

describe('1.1 Global Authentication (Dashboard)', () => {
  before(() => {
    cy.task('resetDb');
    Cypress.session.clearAllSavedSessions();
  });

  beforeEach(() => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
  });

  context('desktop', () => {
    const user = TEST_USERS.user1;

    describe('1.1.1 Registration Flow', () => {
      it('should successfully register', () => {
        cy.visit('/register');
        cy.get('input[name="name"]').type(user.name);
        cy.get('input[name="email"]').type(user.email);
        cy.get('input[name="password"]').type(user.password);
        cy.get('input[name="confirmPassword"]').type(user.password);
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');
      });
    });
  });
});
```

Key patterns:

- `before()` runs once per `describe` — use for DB seeding and session clearing
- `beforeEach()` runs before each `it` — use for viewport and repeated setup
- `context()` groups tests by viewport or scenario (e.g., `context('desktop')`, `context('mobile')`)
- `describe()` groups tests by sub-feature (e.g., `describe('1.1.1 Registration Flow')`)

## Database Seeding

### Cypress Tasks

Register custom Cypress tasks in `cypress.config.ts` for database operations:

```typescript
cy.task('resetDb');   // TRUNCATE CASCADE all tables
cy.task('seedShop');  // Seed a complete shop environment (returns SeedShopResult)
```

Seed functions live in `tests/seeds/` and use factories from `tests/factories/` + insert helpers from `tests/utils/db-test-utils.ts`.

### Important: Clear Sessions After DB Reset

Always call `Cypress.session.clearAllSavedSessions()` after resetting the database. Cached sessions reference user/session rows that no longer exist after a reset:

```typescript
before(() => {
  cy.task('resetDb');
  Cypress.session.clearAllSavedSessions();
});
```

## Authentication

### The `cy.login()` Custom Command

Defined in `tests/cypress/support/commands.ts`, the `cy.login()` command uses Cypress session caching:

```typescript
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();
      cy.url().should('contain', '/dashboard');
    },
    {
      validate() {
        cy.getCookie('my_b2b_catalog.session_token').should('exist');
      },
      cacheAcrossSpecs: false,
    },
  );
});
```

Key details:

- Sessions are cached per `[email, password]` pair within a single spec file
- Validation checks the `my_b2b_catalog.session_token` cookie exists
- `cacheAcrossSpecs: false` prevents stale sessions across spec files

### The `cy.shopLogin()` Custom Command

For shop-specific authentication (buyer login via `/{slug}/login`):

```typescript
cy.shopLogin(seedData.slug, seedData.buyerEmail, seedData.buyerPassword);
```

### Usage

```typescript
import { TEST_USERS } from '@/e2e-support/constants';

const user = TEST_USERS.user1;

it('should access the dashboard', () => {
  cy.login(user.email, user.password);
  cy.visit('/dashboard/settings');
});
```

### Type Declarations

Custom commands are declared in `tests/cypress/support/e2e.ts`:

```typescript
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      shopLogin(slug: string, email: string, password: string): Chainable<void>;
    }
  }
}
```

When adding a new custom command, add its type declaration here.

## Cypress Environment Variables

For tests that need API keys or secrets, use `Cypress.env()`:

```typescript
import { z } from 'zod';

const rawApiKey = Cypress.env('apiKey');
const apiKey = z.string().nonempty().parse(rawApiKey);

cy.get('input[name="apiKey"]').type(apiKey);
```

Configure values in `cypress.env.json` (not committed — copy from `cypress.env.example.json`).

## Element Selection

Use this priority hierarchy for selecting elements:

| Priority | Selector                | When to use                                      |
| -------- | ----------------------- | ------------------------------------------------ |
| 1        | `data-testid`           | Preferred — resilient to markup and text changes |
| 2        | `input[name="..."]`     | Form inputs — stable by design                   |
| 3        | `button[type="submit"]` | Form submission buttons                          |
| 4        | `cy.contains('text')`   | Last resort — depends on UI language             |

### Parameterized `data-testid` Patterns

Use parameterized test IDs with entity IDs for dynamic elements:

```typescript
// Use prefix matching when you don't know the exact entity ID
cy.get('[data-testid^="product-card-"]').should('have.length.greaterThan', 0);

// Use exact matching when you know the ID
cy.get('[data-testid="product-card-abc123"]').click();
```

Use `^=` prefix matching when selecting by parameterized test IDs without knowing the exact entity ID.

## Handling Next.js Errors

Some known errors may bubble up as uncaught exceptions during navigation. Suppress them explicitly per test:

```typescript
it('should show error when registering with existing email', () => {
  cy.on(
    'uncaught:exception',
    (err) => !err.message.includes('User already exists'),
  );

  cy.visit('/register');
  // ...
});
```

Return `false` from the handler to prevent Cypress from failing the test. Only suppress specific, known error messages — never use a blanket `return false`.

## Best Practices

1. **Seed deterministically**: Always use `cy.task('resetDb')` or `cy.task('seedShop')` for deterministic state. Never rely on state from previous tests outside the same `describe` block.

2. **Clear sessions after DB reset**: Call `Cypress.session.clearAllSavedSessions()` whenever you reset the database — cached sessions reference rows that may no longer exist.

3. **No arbitrary waits**: Avoid `cy.wait(ms)`. Use Cypress built-in retry-ability: `cy.get().should()`, `cy.url().should()`, `cy.contains()`. Only use `cy.wait()` for debounced inputs where no other assertion is available.

4. **Element selection hierarchy**: Prefer `data-testid` > `input[name]` > `button[type]` > `cy.contains()`. Add `data-testid` attributes to components when no stable selector exists.

5. **Test isolation**: Each spec file should be self-contained. Use `before()` to set up the database state the spec needs. Do not depend on execution order between spec files.

6. **Viewport testing**: Set viewport in `beforeEach()` using the `VIEWPORTS` constant from `@/e2e-support/constants`. Use `context()` blocks to group tests by viewport:

```typescript
import { VIEWPORTS } from '@/e2e-support/constants';

context('desktop', () => {
  beforeEach(() =>
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height),
  );
  // desktop tests...
});
```

7. **Secret management**: Never commit real API keys. Use `cypress.env.json` (gitignored) for secrets and `cypress.env.example.json` (committed) as the template.

8. **Error suppression**: Only suppress specific, known errors. Always match on the error message string — never use a blanket `return false` in `cy.on('uncaught:exception')`.

9. **Focused tests**: Each `it()` block should test one user flow or behavior. Keep tests short and readable.

10. **Numbered naming**: Follow the `N.M-feature-name.cy.ts` convention. New feature groups get the next available number.

11. **Custom command reuse**: Use `cy.login()` for authentication in tests that aren't specifically testing the login flow. This leverages session caching for faster execution.
