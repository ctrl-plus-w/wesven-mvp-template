# Development Guidelines

## Tools

1. After doing some code, always check that the code style is respected by running `pnpm run lint`.

# Code style

## Project Structure

```
PROJECT_NAME /
├── src/
│   ├── app/
│   ├── assets/
│   ├── classes/
│   ├── components/
│   ├── hooks/
│   ├── instances/
│   ├── schemas/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   ├── wrappers/
│   └── styles/
│
├── public/
└── drizzle/
```

### Folder Descriptions

**/src/app**: This folder is the core of Next.js App Router's routing system. Each `page.tsx` file represents a user-accessible route, and each `layout.tsx` file defines the visual structure shared by its child pages (see Next.js documentation for more information).

You'll also find the `actions/` subfolder containing Server Actions. These are functions that run on the server side but can be called directly from client-side React components. They're particularly useful for operations requiring database access or sensitive processing.

The `api/` subfolder contains traditional REST API routes. These HTTP endpoints are used notably for authentication with Better Auth.

**/src/assets**: This folder contains all assets (images, fonts, videos…) used in the application. It's split into two child folders: `/src/assets/fonts` for fonts and `/src/assets/images` for images. Additional child folders can be added as needed.

**/src/classes**: This folder contains all classes used in the application. It may include API implementation classes, custom errors, or any other type of class useful to the application.

**/src/components**: This folder groups all React components of the application, organized by their level of abstraction and reusability.

The `elements/` subfolder contains the most basic and atomic UI components. These are the fundamental building blocks of the interface: buttons, input fields, cards, labels, etc. These components are generally sourced from shadcn/ui and are highly reusable throughout the application.

The `modules/` subfolder contains more complex components that combine multiple elements to form reusable functional blocks. For example, a header component, a generic modal, or a pagination component.

The `features/` subfolder contains components specific to a particular feature of the application. These components are less generic and correspond to specific business needs. For example, authentication forms or homepage sections.

The `layouts/` subfolder contains layout components that are used regularly throughout the application, most of the time on every page.

Layout components are generally used in the page itself rather than in `layout.tsx` files because it's sometimes necessary to have pages without this layout component.

**/src/hooks**: This folder is intended for custom React hooks. Hooks allow encapsulating reusable logic that can be shared between multiple components. For example, a hook to manage form state, detect screen size, or interact with a specific API.

**/src/instances**: This folder contains the application's singleton instances. A singleton instance is a unique object that is created once and shared throughout the application.

You'll find here notably the database connection with Drizzle, the React Query client configuration, or the authentication configuration with Better Auth. These instances are initialized once at application startup and reused wherever needed.

**/src/schemas**: This folder contains database table definitions. Each file defines the structure of one or more tables in a type-safe manner. This means TypeScript knows exactly the shape of the data, enabling autocompletion and type checking when querying the database.

These schemas also serve as the basis for generating database migrations.

**/src/utils**: This folder contains utility functions reusable throughout the application. These are pure functions that perform common operations like string manipulation, date formatting, or data transformations.

**/src/constants**: This folder contains constant values used in the application. Rather than repeating magic values in the code, they're centralized here. This includes, for example, error messages, configuration values, pagination limits, or any other value that doesn't change during application execution.

**/src/types**: This folder contains TypeScript type definitions shared across the application. When a type is used in multiple places in the code, it's defined here to avoid duplication and ensure consistency.

**/src/wrappers**: This folder contains wrapper components that encapsulate React providers (see HOC concept for example). A provider is a component that supplies context or configuration to all its child components. For example, the React Query wrapper configures the cache client and makes it available throughout the application.

These wrappers are generally used in the root layout to wrap the entire application (often `layout.tsx`).

**/src/styles**: This folder contains the application's global styles. The main file defines Tailwind CSS configuration as well as custom CSS variables used for the application theme (colors, spacing, etc.).

**/public**: This folder contains static assets served directly by the web server. Any file placed here is publicly accessible via its path. This is where you save the favicon and metadata files. Note: For assets, use `/src/assets` instead.

**/drizzle**: This folder contains database migration files automatically generated by Drizzle Kit. These migrations represent the history of database structure changes. They allow the database schema to evolve in a controlled and reproducible manner.

It's important to never modify these files manually. They are automatically generated from schemas defined in `/src/schemas`.

If you've generated a migration you didn't intend to perform (and haven't migrated it yet), you can delete the associated SQL file along with the snapshot file and remove the corresponding object in the `meta/_journal.json` file (e.g., `{ "idx": 43, "version": "7", "when": 1768650453063, "tag": "0043_wooden_living_mummy", "breakpoints": true }`).

## Data handling, query and mutations

This category covers conventions related to data fetching, server-side rendering (SSR), client-side rendering (CSR), and mutations.

1. When the data is fetched client side, use React Query for data fetching and caching.
2. If the data is prefetched on the server side, do not show a loading state on the client side. Instead, directly render the data.
3. When fetching some data, create a custom hook in the `src/hooks/data/` folder for better reusability and separation of concerns.
4. When creating a mutation, if the mutation is used in multiple places or is optimistic, create a custom hook in the `src/hooks/data/` folder. If it is only used in one place, define the mutation logic directly within the component file where it is used.
5. A React Query `queryClient.invalidateQueries(...)` function is asynchronous. If you need to perform an action after invalidation, use the `await` keyword to ensure the invalidation is complete before proceeding.

## Domain Conventions

1. When implementing a form, use the `useForm` hook from the `react-hook-form` library for consistent form handling.
2. Use zod for form validation schemas to ensure robust and type-safe validation. Never set the default values in the schemas, use the `getDefaultValues` function instead.
3. For default values, create a function named `getDefaultValues` that returns an object with the default values for the form fields. This function if possible, should be placed outside the component itself but in the same file.
4. For the form mutations :
   1. DO NOT put the mutation logic inside a separate file unless it is reused in multiple places. Instead, define the mutation logic directly within the component file where it is used.
   2. For error handling, use the `onError` callback provided by the mutation hook to handle errors gracefully.
   3. If a mutation hook is created. Put all the possible logic in it
5. In server actions, if the action involves using an id alone, do not pass the entire object. Instead, only pass the id to optimize performance (and verify that the id is a uuid with zod).
6. When a specific type is needed to be related to a database entity (e.g a user with its products), create this type in the `types/db.ts` file. Always be precise and generic with the naming of these types (e.g UserWithProducts).

## General code conventions

This category covers general coding style and practices to ensure consistency and maintainability across the codebase.

1. Always use arrow functions when defining functions, unless there is a specific need for the `this` context.
2. When defining types, use `VoidFunction` instead of `() => void` for better readability.
3. Only write comments when really necessary. The code itself should be as self-explanatory as possible.
4. When writing functions, write the JSdoc comments for the function signature and types only. Avoid writing comments for the implementation details inside the function body.
5. If a condition expression only takes one line, do not use curly braces `{}` for the block.
6. Never use the `any` type unless in a `react-hook-form` default values object. Always be specific with types to ensure type safety and maintainability.
7. When using `switch`, do not put braces in the blocks unless necessary.

## Naming Conventions

1. All files must be named using kebab-case (e.g., `my-component.tsx`).
2. All React components must be named using PascalCase (e.g., `MyComponent`
3. All pages components must end with "Page" (e.g., `DashboardPage.tsx`).
4. When creating selectors add the name of the selector at the end of the component name. (e.g., `ProductListSelect.tsx` or `ProductListDropdown.tsx`).

## Architecture Conventions

1. Follow the principles of Clean Architecture by separating concerns. For example, slip the React components into multiple folders based on their reusability (e.g., elements, modules, features) and components (tables and forms in their own files).

## Testing Commands

- `pnpm run test:unit` — Run unit tests (pure functions, no DB needed)
- `pnpm run test:integration` — Run integration tests (requires Docker DB via `compose.test.yaml`)
- `pnpm run test:e2e` — Run E2E tests with Cypress (requires Docker DB + built app, uses `compose.test.yaml`)

## Database Commands

- `pnpm run db:generate` — Generate Drizzle migrations from schema changes
- `pnpm run db:migrate` — Run pending migrations
- `pnpm run db:studio` — Open Drizzle Studio to browse the database
- `pnpm run db:empty-migration` — Create an empty custom migration

## Environment Setup

1. Copy `.env.example` to `.env` and fill in the values
2. Start the database: `./start-database.sh`
3. Run migrations: `pnpm run db:migrate`
4. Start dev server: `pnpm run dev`

## Import Ordering

Biome handles import ordering automatically via `pnpm run lint`.
