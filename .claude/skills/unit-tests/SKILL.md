---
name: unit-tests
description: Unit testing conventions and patterns for this codebase. Use when writing, reviewing, or debugging unit tests with Vitest for pure functions, utilities, transformations, and business logic.
---

# Unit Tests

This document covers best practices and conventions for unit testing in this codebase.

## Framework & Configuration

- **Framework**: Vitest 3.x with node environment
- **Config file**: `vitest.unit.config.mts`
- **Test pattern**: `tests/unit/**/*.test.ts`
- **Run command**: `pnpm test:unit`

## Folder Structure

```
tests/
├── unit/
│   ├── utils/             # Utility function tests
│   ├── classes/           # Class tests
│   └── ...                # Mirror source folder structure
├── factories/             # Shared test data factories
└── utils/                 # Shared test helpers
```

## Test File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Test files | `*.test.ts` | `format-price.test.ts`, `cart-calculator.test.ts` |
| Factory files | `*.factory.ts` | `product.factory.ts`, `order.factory.ts` |

## Test Structure

Use nested `describe` blocks to organize related tests. Follow the Arrange-Act-Assert pattern.

### Describe Naming Convention

Top-level `describe` blocks should name the test file's domain (e.g., `'Price Formatting'`). Sub-`describe` blocks should use **use case / behavior names** (e.g., `'Formatting with currency symbol'`, `'Handling edge cases'`), **not** function names (e.g., ~~`'formatPrice'`~~, ~~`'calculateDiscount'`~~).

```typescript
import { describe, expect, it } from 'vitest';

describe('Price Formatting', () => {
  describe('Formatting with currency symbol', () => {
    it('prepends the currency symbol to the amount', () => {
      // Arrange
      const amount = 1999;
      const currency = 'EUR';

      // Act
      const result = formatPrice(amount, currency);

      // Assert
      expect(result).toBe('€19.99');
    });
  });

  describe('Handling edge cases', () => {
    it('returns zero formatted when amount is 0', () => {
      expect(formatPrice(0, 'EUR')).toBe('€0.00');
    });
  });
});
```

## Factory Patterns

### Mock Factories (for in-memory objects)

Use `createMock*` naming for factories that produce plain objects mimicking domain entities. These never touch a database.

```typescript
// tests/factories/product.factory.ts
export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: crypto.randomUUID(),
  name: faker.commerce.productName(),
  price: parseFloat(faker.commerce.price()),
  description: faker.commerce.productDescription(),
  createdAt: new Date(),
  ...overrides,
});
```

### Inline Helpers for Simple Cases

When a test only needs trivial data, prefer inline helpers over importing a factory:

```typescript
const makeItem = (name: string, quantity: number) => ({ name, quantity });

it('sums item quantities', () => {
  const items = [makeItem('A', 2), makeItem('B', 3)];
  expect(sumQuantities(items)).toBe(5);
});
```

### Specialized Factories

Create specialized factories for common test scenarios by composing base factories:

```typescript
export const createMockDiscountedProduct = (discount: number) =>
  createMockProduct({
    price: 100,
    discount,
    finalPrice: 100 - discount,
  });
```

## Mocking

### When to Mock

- **Do mock**: External modules, third-party services, environment-dependent code, time-sensitive logic (`vi.useFakeTimers`)
- **Do not mock**: The function under test, pure utility functions, simple data transformations

### `vi.fn()` — Standalone Mock Functions

```typescript
const onSubmit = vi.fn();

myFunction({ onSubmit });

expect(onSubmit).toHaveBeenCalledOnce();
expect(onSubmit).toHaveBeenCalledWith({ id: '123' });
```

### `vi.mock()` — Module Mocking

Mock an entire module before imports are resolved. Place at the top of the file.

```typescript
vi.mock('../config', () => ({
  getConfig: vi.fn(() => ({ apiUrl: 'https://test.example.com' })),
}));

import { getConfig } from '../config';
```

### `vi.spyOn()` — Partial Mocking

Spy on a single method while keeping the rest of the module intact:

```typescript
import * as mathUtils from '../math-utils';

const spy = vi.spyOn(mathUtils, 'randomInt').mockReturnValue(42);

const result = generateCode();

expect(result).toContain('42');
spy.mockRestore();
```

### Resetting Mocks

Always clear mocks between tests to prevent state leaking:

```typescript
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});
```

## Testing Pure Functions

Unit tests shine when testing pure functions — no side effects, deterministic output.

### Direct Input / Output

```typescript
describe('Slug generation', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(toSlug('Price: $50!')).toBe('price-50');
  });
});
```

### Edge Cases

Always test boundaries and unusual inputs:

```typescript
describe('Clamping values', () => {
  it('returns min when value is below range', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('returns max when value is above range', () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });

  it('returns the value when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('handles min equal to max', () => {
    expect(clamp(50, 10, 10)).toBe(10);
  });
});
```

### Error Cases

Test that functions throw or return errors for invalid input:

```typescript
it('throws when dividing by zero', () => {
  expect(() => safeDivide(10, 0)).toThrow('Division by zero');
});

it('returns an error result for invalid email', () => {
  const result = validateEmail('not-an-email');
  expect(result.success).toBe(false);
  expect(result.error).toBe('Invalid email format');
});
```

## Testing Business Logic

### Complex Transformations

```typescript
describe('Cart total calculation', () => {
  it('applies percentage discount to eligible items', () => {
    const cart = {
      items: [
        createMockCartItem({ price: 100, quantity: 2, eligible: true }),
        createMockCartItem({ price: 50, quantity: 1, eligible: false }),
      ],
      discount: { type: 'percentage', value: 10 },
    };

    const total = calculateCartTotal(cart);

    // 100*2 = 200, 10% off eligible = 180, plus 50 = 230
    expect(total).toBe(230);
  });
});
```

### Stateful Logic (Classes)

```typescript
describe('State Machine', () => {
  it('transitions from idle to loading on fetch', () => {
    const machine = new StateMachine('idle');

    machine.send('FETCH');

    expect(machine.state).toBe('loading');
  });

  it('ignores invalid transitions', () => {
    const machine = new StateMachine('idle');

    machine.send('COMPLETE');

    expect(machine.state).toBe('idle');
  });
});
```

### Parameterized Tests

Use `it.each` for data-driven testing with many input/output combinations:

```typescript
describe('Status label', () => {
  it.each([
    ['pending', 'Pending Review'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['unknown', 'Unknown'],
  ])('returns "%s" → "%s"', (status, expected) => {
    expect(getStatusLabel(status)).toBe(expected);
  });
});
```

## Best Practices

1. **Isolation**: Each test must be fully independent. Never rely on execution order or shared mutable state between tests.

2. **No side effects**: Unit tests must not touch the database, network, or filesystem. If the code under test does, mock those dependencies.

3. **Fast execution**: Unit tests should run in milliseconds. Avoid `setTimeout`, real timers, or heavy computation. Use `vi.useFakeTimers()` when testing time-dependent logic.

4. **Prefer synchronous tests**: When testing pure functions, write synchronous tests. Only use `async/await` when the function under test is genuinely asynchronous.

5. **Factory composition**: Build specialized factories on top of base factories to keep test setup DRY without sacrificing readability.

6. **Cover edge cases**: Test boundaries, empty inputs, null/undefined, large values, and unexpected types. These are where bugs hide.

7. **Type safety**: Let TypeScript enforce factory shapes. Factories should return properly typed objects so tests catch type mismatches at compile time.

8. **Single assertion focus**: Each test should verify one behavior. Multiple `expect` calls are fine when they assert different facets of the same behavior, but avoid testing unrelated behaviors in a single `it` block.

9. **Descriptive test names**: Test names should read as sentences describing the expected behavior, not the implementation. Prefer `'returns empty array when no items match'` over `'test filter function'`.

10. **Minimal mocking**: Only mock what you must. The more real code your test exercises, the more confidence it provides. Over-mocking leads to tests that pass while the real code is broken.
