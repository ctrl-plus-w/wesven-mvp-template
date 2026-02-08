---
name: integration-tests
description: Integration testing conventions and patterns for this codebase. Use when writing, reviewing, or debugging integration tests with Vitest, MSW, and database testing.
---

# Integration Tests

This document covers best practices and conventions for integration testing in this codebase.

## Framework & Configuration

- **Framework**: Vitest 3.x with jsdom environment
- **Config file**: `vitest.integration.config.mts`
- **Setup file**: `tests/setup/vitest-integration.setup.ts`
- **Test pattern**: `tests/integration/**/*.test.{ts,tsx}`
- **Run command**: `pnpm test:integration`

## Folder Structure

```
tests/
├── integration/
│   ├── actions/           # Server action tests
│   └── components/        # Component integration tests
├── factories/             # Test data factories
├── mocks/
│   ├── handlers/          # MSW HTTP handlers
│   ├── handlers.ts        # Handler aggregation
│   └── node.ts            # MSW server setup
├── setup/
│   └── vitest-integration.setup.ts
└── utils/
    ├── auth.ts            # Authentication helpers
    ├── db-test-utils.ts   # Database utilities
    └── render-with-providers.tsx
```

## Test File Naming

| Type          | Convention                  | Example                                    |
| ------------- | --------------------------- | ------------------------------------------ |
| Test files    | `*.test.ts` or `*.test.tsx` | `rules.test.ts`, `shop-page.test.tsx`      |
| Factory files | `*.factory.ts`              | `user.factory.ts`, `price-rule.factory.ts` |

## Test Structure

Use nested `describe` blocks to organize related tests. Follow the Arrange-Act-Assert pattern.

### Describe Naming Convention

Top-level `describe` blocks should name the test file's domain (e.g., `'Products Server Actions'`). Sub-`describe` blocks should use **use case / feature names** (e.g., `'Listing categories'`, `'Creating and updating products'`, `'Deleting clients'`), **not** function names (e.g., ~~`'getCategories'`~~, ~~`'upsertProduct'`~~, ~~`'deleteClient'`~~).

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Feature Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Listing items", () => {
    it("describes expected behavior", async () => {
      // Arrange
      const data = createTestData();

      // Act
      const result = await someAction(data);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

## Factory Patterns

### Data Factories (for database insertion)

Use `create*Data` naming for factories that produce database-insertable objects.

```typescript
// tests/factories/user.factory.ts
export const createUserData = (
  overrides: Partial<UserInsert> = {},
): UserInsert => {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};
```

### Mock Factories (for component testing)

Use `createMock*` naming for in-memory mock objects used in component tests.

```typescript
// tests/factories/organization.factory.ts
export const createMockOrganization = (
  options: CreateMockOrganizationOptions = {},
): OrganizationWithRelations => {
  const data = createOrganizationData();
  return {
    ...data,
    products: options.products ?? [],
    categories: options.categories ?? [],
  };
};
```

### Specialized Factories

Create specialized factories for common test scenarios:

```typescript
export const createMinimumOrderRuleData = (
  organizationId: string,
  minimumTotal: number,
) =>
  createPriceRuleData(organizationId, {
    operator: "gte",
    operatorOn: "total",
    value: minimumTotal.toString(),
  });
```

## Database Testing

### Setup and Teardown

The setup file handles database lifecycle:

```typescript
// tests/setup/vitest-integration.setup.ts
beforeAll(async () => {
  server.listen({ onUnhandledRequest: "warn" });
  await setupTestDatabase();
});

afterAll(async () => {
  server.close();
  await teardownTestDatabase();
});

afterEach(async () => {
  cleanup();
  await resetTables(); // TRUNCATE CASCADE
  vi.clearAllMocks();
});
```

### Database Insert Helpers

Use `insert*` functions from `db-test-utils.ts`:

```typescript
const user = await insertUser(createUserData());
const organization = await insertOrganization(createOrganizationData());
const member = await insertMember(createMemberData(organization.id, user.id));
```

## Authentication Mocking

### Setup Pattern

```typescript
// 1. Mock the auth module at the top of the test file
vi.mock("@/instance/auth/server", () => ({
  default: { api: { getSession: vi.fn() } },
}));

// 2. Import the mocked module
import auth from "@/instance/auth/server";

// 3. Create auth setup helpers
const {
  setupUnauthenticated,
  setupNoActiveOrganization,
  setupAuthenticatedUser,
} = createAuthSetup(auth);
```

### Usage in Tests

```typescript
it("requires authentication", async () => {
  setupUnauthenticated();
  await expect(unwrapServerAction(protectedAction())).rejects.toThrow(
    ServerActionError,
  );
});

it("works when authenticated", async () => {
  const { organization, member, user } = await setupAuthenticatedUser();
  const result = await unwrapServerAction(protectedAction());
  expect(result).toBeDefined();
});
```

### Testing Protected Actions

Use `describeProtectedActions` for consistent auth guard testing:

```typescript
const protectedActions: ProtectedActions = {
  getItems: () => getItems({ pageIndex: 0, pageSize: 10 }),
  createItem: () => createItem(createItemInput()),
  deleteItem: () => deleteItem(id()),
};

describe("Authorization", () => {
  describeProtectedActions(protectedActions, {
    setupUnauthenticated,
    setupNoActiveOrganization,
  });
});
```

## External API Mocking (MSW)

### Handler Pattern

Create factory functions for HTTP handlers:

```typescript
// tests/mocks/handlers/pennylane.ts
export const createPennylaneCustomersHandler = (data?: unknown): HttpHandler =>
  http.get(pennylaneUrl("/customers"), ({ request }) => {
    if (data) return HttpResponse.json(data);
    return HttpResponse.json(customersFixture);
  });

export const createPennylaneCreateCustomerHandler = (
  onCustomerCreated?: (customer: unknown) => void,
): HttpHandler =>
  http.post(pennylaneUrl("/customers"), async ({ request }) => {
    const body = await request.json();
    const newCustomer = { id: generateId(), ...(body as object) };
    onCustomerCreated?.(newCustomer);
    return HttpResponse.json(newCustomer, { status: 201 });
  });
```

### Aggregating Handlers

```typescript
// tests/mocks/handlers.ts
import { pennylaneHandlers } from "./handlers/pennylane";
import { blobStorageHandlers } from "./handlers/blob-storage";

export default [...pennylaneHandlers, ...blobStorageHandlers];
```

## Component Testing

### Rendering with Providers

Use `renderWithProviders` for components that need context:

```typescript
import { renderWithProviders } from '@/test-util/render-with-providers';

it('renders products', () => {
  const organization = createMockShopOrganization(4, 2);
  renderWithProviders(<ShopPage organization={organization} />);

  expect(screen.getAllByTestId(/^product-card-/)).toHaveLength(4);
});
```

### Providing Test Context

```typescript
renderWithProviders(<ShopPage organization={organization} />, {
  cart: { defaultProducts: [{ id: product.id, quantity: 1 }] },
});
```

### Browser API Mocks

Mock browser APIs in `beforeAll`:

```typescript
beforeAll(() => {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
```

## Server Action Testing

### Unwrapping Server Actions

Use `unwrapServerAction` to handle the server action response wrapper:

```typescript
const result = await unwrapServerAction(
  getItems({ pageIndex: 0, pageSize: 10 }),
);
expect(result.items).toHaveLength(3);
```

### Testing Error Cases

```typescript
it("throws when item not found", async () => {
  await setupAuthenticatedUser();
  await expect(unwrapServerAction(deleteItem(nonExistentId))).rejects.toThrow(
    ServerActionError,
  );
});
```

### Testing Silent Failures

Test operations that don't affect data outside the user's scope:

```typescript
it("does not delete items from other organizations", async () => {
  const { organization: org1 } = await setupAuthenticatedUser();
  const org2 = await insertOrganization(createOrganizationData());
  const otherItem = await insertItem(createItemData(org2.id));

  // Should not throw but also should not delete
  await unwrapServerAction(deleteItem(otherItem.id));

  const stillExists = await db.query.item.findFirst({
    where: eq(item.id, otherItem.id),
  });
  expect(stillExists).toBeDefined();
});
```

## Best Practices

1. **Isolation**: Each test should be independent. Use `resetTables()` in `afterEach` to ensure clean state.

2. **Explicit setup**: Always set up auth state explicitly using `setupAuthenticatedUser()` or similar helpers.

3. **Test data-testid**: Use `data-testid` attributes for reliable element selection in component tests.

4. **Pagination testing**: Test pagination scenarios with multiple pages of data.

5. **Multi-tenant isolation**: Verify that operations don't affect data from other organizations.

6. **Error assertions**: Use `rejects.toThrow()` for async error testing.

7. **Factory composition**: Build specialized factories on top of base factories.

8. **MSW for external APIs**: Never make real HTTP requests in tests. Mock all external APIs with MSW.

9. **Avoid mocking internal modules**: Only mock auth and external dependencies. Test real database interactions.

10. **Timeouts**: Integration tests have 30-second timeout. Keep tests fast but allow for database operations.
