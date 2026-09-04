# MVP Template

A production-ready Next.js starter template with authentication, database, and testing infrastructure.

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Design system**: [Astryx](https://github.com/facebook/astryx) (`@astryxdesign/core`)
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

- Node.js >= 22.13 (see `.nvmrc`; the Astryx CLI enforces this floor)
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

This template deploys via **GitHub Actions running the Vercel CLI** to **Vercel hosting** with a **Vercel-managed Neon Postgres** database. CI is the single source of production deploys, so no untested code ever ships.

### One-time setup

1. **Use this template** on GitHub (`Use this template → Create a new repository`) or fork it.

2. **Create a Vercel project** pointing at your fork (https://vercel.com/new). Framework preset: Next.js. Then **disable Vercel's auto-deploy on push** so CI is the only deploy path:

   > Project → Settings → Git → "Ignored Build Step" → set to `exit 0`.

   Without this, every push to `main` will deploy twice (once via Vercel's git integration, once via this workflow).

3. **Provision Neon Postgres** via Vercel:

   > Project → Storage → Create Database → Neon (Marketplace) → attach to Production.

   This auto-injects `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, and friends.

4. **Set the remaining production env vars** in Vercel (Project → Settings → Environment Variables → Production):

   | Variable                   | Source                                                 |
   | -------------------------- | ------------------------------------------------------ |
   | `DATABASE_URL`             | auto-injected by Neon                                  |
   | `DATABASE_URL_UNPOOLED`    | auto-injected by Neon                                  |
   | `BLOB_READ_WRITE_TOKEN`    | auto-injected by Vercel Blob (Storage → Create → Blob) |
   | `BETTER_AUTH_SECRET`       | `openssl rand -base64 32`                              |
   | `BETTER_AUTH_URL`          | your production URL, e.g. `https://app.example.com`    |
   | `NEXT_PUBLIC_APP_URL`      | same as `BETTER_AUTH_URL`                              |
   | `RESEND_FROM_EMAIL`        | configured sender on https://resend.com                |
   | `RESEND_API_KEY`           | from Resend dashboard                                  |
   | `NEXT_PUBLIC_POSTHOG_KEY`  | from PostHog project settings                          |
   | `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` (or your region)            |

5. **Link the project locally** to grab the Vercel org and project IDs:

   ```bash
   pnpm dlx vercel link
   cat .vercel/project.json   # contains orgId and projectId
   ```

   (Alternatively, copy them from Vercel: Account Settings → org ID; Project Settings → project ID.)

6. **Create the `ci-cd` GitHub environment** (Repo → Settings → Environments → New environment → `ci-cd`) and add these **Environment secrets**:
   - `VERCEL_TOKEN` — generate at https://vercel.com/account/tokens
   - `VERCEL_ORG_ID` — from step 5
   - `VERCEL_PROJECT_ID` — from step 5
   - `DATABASE_URL` — copy from Vercel project env
   - `DATABASE_URL_UNPOOLED` — copy from Vercel project env (used by the `migrate` job for DDL)
   - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
   - `RESEND_FROM_EMAIL`, `RESEND_API_KEY`
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

7. **Enable deploys** by adding a repo **Variable** (not a Secret):

   > Repo → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable: `DEPLOYMENT_ENABLED=true`.

   The `migrate` and `deploy` jobs are gated on this variable, so without it CI runs lint + tests only.

8. **Push to `main`.** CI runs `lint` → `unit-tests` + `integration-tests` + `e2e-tests` (parallel) → `migrate` → `deploy`. The first green run publishes the app.
