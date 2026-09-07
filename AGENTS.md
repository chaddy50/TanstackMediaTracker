# AGENTS.md

Media Tracker: a TanStack Start (React) app for tracking media (movies, shows, books, etc.) with a Postgres database via Drizzle.

## Stack

- TanStack Start + React, routes under `src/routes/`
- Drizzle ORM + Postgres, schema/migrations managed via `db:generate` / `db:migrate` / `db:push`
- Vitest for unit tests (`vitest.config.ts`) and integration tests (`vitest.config.integration.ts`, needs `docker-compose.test.yml` / `.env.test`)
- Biome for lint/format (`pnpm check`, `pnpm format`, `pnpm lint`)
- i18n under `src/i18n/locales/`

## Layout

- `src/features/` — feature-first: each screen/feature owns its own components, hooks, and `__tests__/` (e.g. `src/features/screens/settings/`, `src/features/mediaItemSearch/`).
- `src/routes/` — TanStack Router file-based routes; `_authenticated/` requires auth, `api/` is server routes.
- `src/database/` — Drizzle schema and query helpers.
- `src/lib/` — cross-feature utilities (e.g. `genres/`, `queries/`).
- `src/components/` — shared UI components (`ui/` is the design-system layer) and shared hooks.
- Tests live in `__tests__/` next to the code they cover, not in a parallel tree.

## Commands

- `pnpm dev` — run the app locally.
- `pnpm test` — unit tests. `pnpm test:integration` — integration tests (spins up the test DB via the pretest hook).
- `pnpm typecheck`, `pnpm check` — before declaring work complete, run whichever of these apply to what you changed.
- `pnpm db:generate` / `pnpm db:migrate` — after editing `src/database/` schema.

## Conventions

- Feature-first placement: new code goes inside the relevant `src/features/**` folder, not into a generic shared bucket, unless it's genuinely used by 2+ features.
- Colocate tests in `__tests__/` beside the source file.
- Don't hand-edit generated Drizzle migration files; regenerate via `db:generate`.

## Git & Commits

- **Never include Claude (or any AI assistant) as a commit co-author or contributor.** No `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line, no assistant mention in commit messages, PR titles, or PR descriptions. Write commits as the author, describing the change and why.
- Create commits only when explicitly asked.
