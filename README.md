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

- Node.js 22, from 22.13 (see `.nvmrc`; the Astryx CLI enforces this floor, and `engines` pins the major Vercel builds with)
- pnpm 10.26+ (pinned through `packageManager`; `corepack enable` picks it up)
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
| `pnpm run deploy:setup`     | Set up Vercel production and the GitHub deploy  |
| `pnpm run deploy:check`     | Check the deploy settings (run by CI)           |

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

Production runs on **Vercel** with a **Vercel-managed Neon Postgres** database and a **Vercel Blob** store. GitHub Actions is the only deploy path: a push to `main` runs lint and every test suite, and only a green run deploys.

### One-command setup

Prerequisites: the [GitHub CLI](https://cli.github.com), and a repository on GitHub created from this template that the `origin` remote points to.

```bash
pnpm deploy:setup
```

The setup walks through each step on screen and skips what already exists, so it is safe to run again after a failure. It:

1. Logs in to GitHub and Vercel when needed, then creates the Vercel project and links this folder (`.vercel/`, git-ignored). When the team already has a project with that name, it asks before taking it over. It sets the Next.js preset, the Node major of `.nvmrc`, and the system variables.
2. Creates a free Neon database connected to Production only, in the region you pick, and moves the functions to that region. It then offers a Blob store in the same region and a custom domain (it prints the DNS records the domain still needs).
3. Fills every Production variable the env schemas (`src/utils/schemas/env*.ts`) require:
   - `BETTER_AUTH_SECRET` and `CRON_SECRET` are generated, never copied from development.
   - It lists the real values found in your shell and `.env`, and copies the ones you keep ticked. Placeholders, `localhost` values and values the schema rejects are skipped.
   - It asks for the rest, hiding secrets and checking each value against the schema.
   - `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` stay unset. The app reads Vercel's production domain instead.
4. Optionally, it turns on source-map upload to PostHog and deploy markers on PostHog charts. Give it a personal API key made for this alone (scopes `error_tracking:write` and `annotation:write`): Vercel stores it as a Sensitive variable, which the running app can read too.
5. Stores what GitHub needs and nothing more:
   - the `VERCEL_TOKEN` secret, in the `ci-cd` environment, which it creates restricted to `main`. GitHub Free has no environments for a private repository, so there the secret goes to the repository instead;
   - the `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and `DEPLOYMENT_ENABLED=true` variables;
   - with PostHog, the `POSTHOG_ANNOTATIONS_API_KEY` secret and the `POSTHOG_PROJECT_ID` and `POSTHOG_APP_HOST` variables.

   The token is created for you, limited to the project, when the Vercel login allows it. Otherwise the setup asks you to paste one from https://vercel.com/account/tokens: scope it to the project.
6. Starts the pipeline on `main` and follows it until the app is live. When local `main` has unpushed commits it offers to push them, and that push is the run it follows.

Once GitHub deploys are enabled, a second run asks nothing it was answered before: it keeps the token, skips the Blob store, domain and PostHog offers you declined, and deploys only when it changed something or the last deploy failed. `pnpm deploy:setup --reconfigure` asks everything again.

Secrets are passed to `vercel` and `gh` through stdin, never on a command line, and the setup never prints them. The ids and other non-secret variables are plain arguments.

### How a deploy works

`lint` (audit, Biome, `tsc`) → `unit-tests` + `integration-tests` + `e2e-tests` → `deploy`.

- The test jobs need no secret. They use the committed `.env.test` and fixed test values, so they also run on pull requests from forks.
- `deploy` first runs `pnpm deploy:check`, which names any missing token, id or Production variable. It then calls `vercel deploy --prod`, so Vercel builds the commit with its own environment variables. Sensitive values stay readable at build time this way, which `vercel pull` cannot do.
- On Vercel, `pnpm build:vercel` builds the app and then applies pending migrations through `DATABASE_URL_UNPOOLED`. A failed `next build` leaves the database untouched. A failed migration fails the deploy, and the previous version keeps serving. Migrations commit before Vercel uploads the build, so a deploy that fails after them leaves the schema ahead of the live version: keep each migration backward compatible (add a column first, drop the old one in a later deploy).
- The source-map upload never fails the build. When PostHog cannot be reached the build goes on without them, and maps that did not upload are deleted rather than served.
- `vercel.json` turns off Vercel's own Git deploys, so each push deploys once. It also forces the build to run even when the project has an Ignored Build Step.
- Without `DEPLOYMENT_ENABLED=true`, CI runs lint and tests only.

To deploy again without a new commit, run the **CI/CD** workflow from the Actions tab (`workflow_dispatch`).

### Projects set up before `deploy:setup`

- They keep working: `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are still read from the `ci-cd` secrets when the variables are missing.
- The `DATABASE_URL*`, `BETTER_AUTH_*`, `NEXT_PUBLIC_*` and `RESEND_*` GitHub secrets are no longer read, and can be deleted. Production reads them from Vercel.
- Source maps now upload during the Vercel build. Add `POSTHOG_SOURCEMAPS_API_KEY`, `POSTHOG_PROJECT_ID` and `POSTHOG_APP_HOST` to the Vercel Production variables. In GitHub, the key only marks deploys now, under `POSTHOG_ANNOTATIONS_API_KEY` or its old name.
- Add `ENABLE_EXPERIMENTAL_COREPACK=1` to Production, so Vercel installs the pnpm version in `packageManager`.
- `pnpm deploy:setup` adds the missing variables for you. It deletes nothing.

