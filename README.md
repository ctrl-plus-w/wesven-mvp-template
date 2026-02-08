# MVP Template

A production-ready Next.js starter template with authentication, database, and testing infrastructure.

## Tech Stack

- **Framework**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Drizzle ORM (PostgreSQL)
- **Authentication**: Better Auth
- **Data Fetching**: React Query
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest, Cypress
- **Linting**: Biome
- **Analytics**: PostHog
- **Storage**: Vercel Blob
- **Email**: Resend

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc` for version)
- pnpm 8
- Docker

### Setup

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

3. Start the database:

```bash
./start-database.sh
```

4. Run migrations:

```bash
pnpm run db:migrate
```

5. Start the development server:

```bash
pnpm run dev
```

## Project Structure

```
src/
├── app/            # Next.js App Router pages, layouts, server actions, and API routes
├── assets/         # Static assets (images, fonts)
├── classes/        # Application classes (API clients, custom errors)
├── components/
│   ├── elements/   # Atomic UI components (buttons, inputs, cards)
│   ├── modules/    # Composite reusable components (header, modals)
│   ├── features/   # Feature-specific components (auth forms, dashboard sections)
│   └── layouts/    # Layout components used across pages
├── hooks/          # Custom React hooks
├── instances/      # Singleton instances (database, auth, query client)
├── schemas/        # Drizzle database table definitions
├── utils/          # Utility functions
├── constants/      # Constant values
├── types/          # Shared TypeScript type definitions
├── wrappers/       # React provider wrappers
└── styles/         # Global styles and Tailwind configuration

public/             # Publicly served static files
drizzle/            # Auto-generated database migrations
```

## Available Scripts

| Script                      | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `pnpm run dev`              | Start the development server                    |
| `pnpm run build`            | Build the application for production            |
| `pnpm run start`            | Start the production server                     |
| `pnpm run lint`             | Run Biome linter and type checking              |
| `pnpm run db:generate`      | Generate Drizzle migrations from schema changes |
| `pnpm run db:migrate`       | Run pending database migrations                 |
| `pnpm run db:studio`        | Open Drizzle Studio to browse the database      |
| `pnpm run test:unit`        | Run unit tests                                  |
| `pnpm run test:integration` | Run integration tests (requires Docker DB)      |
| `pnpm run test:e2e`         | Run E2E tests (requires Docker DB + built app)  |

## Authentication

Built with [Better Auth](https://www.better-auth.com/) providing:

- Email/password authentication
- Password reset flow
- Account deletion
- Cookie-based sessions

## Testing

Three levels of testing are available:

- **Unit tests** (Vitest) -- Pure function tests, no database required. Run with `pnpm run test:unit`.
- **Integration tests** (Vitest + Docker DB) -- Tests that require a real database via `compose.test.yaml`. Run with `pnpm run test:integration`.
- **E2E tests** (Cypress) -- Full-stack tests requiring Docker DB and a built application. Run with `pnpm run test:e2e`.

## Deployment

Built for Vercel deployment. Requires:

- A PostgreSQL database
- Environment variables configured (see `.env.example`)
