# AGENTS.md

Workforce payroll and back-office operations app for a laundry business.
Bounded context: **workers, employment, timesheets, payroll, salary advances, expenses**.
Domain glossary: `UBIQUITOUS_LANGUAGE.md`.

## Setup and commands

```bash
npm install                     # install deps
npm run dev                     # dev server (Turbopack)
npm run build                   # production build
npm run lint                    # ESLint (flat config, core-web-vitals + TS)
npm run test                    # unit tests (Vitest; same as test:unit)
npm run test:unit               # Vitest (all unit tests)
npm run test:unit:watch         # Vitest watch mode
npm run test:unit:worker        # worker-focused Vitest paths
npm run db:reset                # wipe + push schema + seed (DATABASE_URL)
npm run db:migrate              # drizzle-kit push (db/schema.ts) + custom SQL schema artifacts (DATABASE_URL)
npm run db:seed                 # seed the database (Postgres only; create Auth users in Supabase Studio)
npm run db:seed:workers         # wipe + push schema + seed workers + public holidays only (DATABASE_URL)
npm run db:wipe                 # wipe database (DATABASE_URL)
```

### File-scoped validation

```bash
npx tsc --noEmit                            # typecheck entire project
npx eslint <file>                           # lint a single file
npx vitest run <path/to/file.test.ts>       # run one Vitest file (co-located with source)
```

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript 5 · PostgreSQL + Drizzle ORM · shadcn/ui (new-york) · Tailwind CSS v4 · TanStack React Table v8 · react-hook-form + Zod · Recharts · Vitest. PDF/zip export uses `playwright-core` + headless Chromium at runtime (not the Playwright test runner).

## Architecture

- **Server components by default.** Add `"use client"` only for interactive pieces (forms, tables, dropdowns).
- **Auth entry flow.** `/` remains the marketing landing page, `/login` is the public email-and-password sign-in boundary, and `proxy.ts` refreshes the Supabase session and redirects unauthenticated requests into `/login` (except `/login` and `/auth/**`).
- **Server actions** live in `actions.ts` files co-located with each feature route under `app/dashboard/<feature>/`. They start with `"use server"`, validate from `FormData`, return `{ success, id? } | { error }`, and call `revalidatePath` after mutations. Keep them for semantic form submissions only; non-form payroll reads, commands, and exports belong under `app/api/`.
- **Payroll public holidays** live under `app/dashboard/payroll/public-holidays/` as a year-scoped server-action-backed management page. Treat the holiday list as shared payroll master data saved as a full-year replacement update. New Draft payroll creation derives `publicHolidays` from configured holiday dates that match seeded or live timesheet `dateIn` values inside the payroll period, including cross-year periods. Saving a holiday year also refreshes overlapping Draft payroll vouchers in place and revalidates payroll list/detail screens; Settled payrolls stay frozen.
- **API routes** live under `app/api/` for non-form HTTP workflows such as exports and client-triggered mutations. Prefer the shared transport spine in `app/api/_shared/` for authenticated-session checks, JSON responses, and route-level revalidation so handlers stay thin. Protected handlers should call `requireCurrentApiUser()` and return `401` JSON for unauthenticated callers rather than issuing login redirects. Examples: worker mass minimum-hours updates run through `PATCH /api/workers/minimum-working-hours`; timesheet deletion and AttendRecord imports run through `DELETE /api/timesheets/[id]` and `POST /api/timesheets/import`; payroll lazy reads such as revert previews, settlement candidates, and download selections run through `GET /api/payroll/[id]/revert-preview`, `GET /api/payroll/settlement-candidates`, and `GET /api/payroll/download-selection`; payroll and advance exports run through `GET /api/payroll/[id]/pdf`, `POST /api/payroll/download-zip`, and `GET /api/advance/[id]/pdf`.
- **Service boundary** keeps business rules out of transport code. Shared use-case modules live under `services/<feature>/`; server actions and route handlers should adapt inputs, call services, and handle revalidation.
- **Guided monthly workflow activity** is month-scoped shared operational guidance keyed by the business timezone month (`Asia/Singapore`). It tracks five steps (mass minimum-hours, timesheet import, draft payroll generation, payroll ZIP download, draft payroll settlement); successful operations emit `guided_monthly_workflow_activity` rows, and the dashboard snapshot derives `done/current/up next`. **Revalidate** `"/dashboard"` in API routes and `createPayroll` actions after these mutations so the home workflow card does not go stale.
- **Input validation** belongs at the boundary. **Persisted shapes** (forms and API bodies that map to Drizzle columns) should use Zod schemas in [`db/schemas/`](db/schemas/) derived from tables with [`drizzle-zod`](https://orm.drizzle.team/docs/zod) (`createInsertSchema` / `createSelectSchema`), following [`db/schemas/worker-employment.ts`](db/schemas/worker-employment.ts). Shared HTTP-only contracts for a few routes live in [`db/schemas/api.ts`](db/schemas/api.ts). Keep hand-written Zod for **login**, **external import envelopes** (e.g. AttendRecord JSON), and other shapes with no table mapping.
- **Forms** use react-hook-form + `zodResolver` for complex cases, or plain `useState` + `FormData` for simple ones. All form pages use `FormPageLayout` (back button, title, subtitle, optional actions slot).
- **Data tables** use the shared `DataTable` from `components/data-table/`. Columns are defined in `columns.tsx` next to the route. Use `createSortableHeader`, `createBadgeCell`, `createActionsColumn` from `column-builders.tsx`.
- **Async UX** must expose loading state. Interactive client components show pending/disabled UI for submits and fetches; async route sections should use Suspense or a route-level loading fallback where the wait is user-visible.
- **Database tables** use `pgTable("snake_case", { ... })` with UUID PKs. Enums are `text(..., { enum: [...] as const })` aligned with `types/status.ts`. Types are exported via `$inferSelect` / `$inferInsert`.
- **Timesheet hours** are schema-owned. `timesheetTable.hours` is a Postgres generated column derived from `dateIn` / `timeIn` / `dateOut` / `timeOut`; application writes and imports should send timestamps only and let the DB compute hours.
- **Database connection.** `lib/db.ts` uses `DATABASE_URL` for the app, Drizzle Kit (`npm run db:migrate`), wipe, and seed. Hosted Supabase provides Postgres and Auth; Drizzle remains schema authority. PostgreSQL features that Drizzle does not model directly, such as the payroll worker-period exclusion constraint, are applied by the custom SQL step chained after `drizzle-kit push`.
- **Voucher numbering.** `payrollVoucherTable.voucherNumber` is a text serial allocated transactionally as a year-scoped formatted value like `2026-0001`; treat it as a human-facing identifier, not a numeric counter in application code.
- **Auth contract.** Any Supabase Auth user who completes `signInWithPassword` with email and password may use the dashboard and API routes; there is no app-level email allowlist. Create users in Supabase Studio (or Auth Admin API) when self-service signup is disabled. Runtime needs `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key; `SUPABASE_SERVICE_ROLE_KEY` is for tooling and server-side admin APIs only, not for normal browser sign-in.
- **Auth session handling.** Cookie-backed Supabase SSR clients live under `lib/supabase/` for browser, server, and proxy contexts. Use `supabase.auth.getUser()` for server-side authorization checks, and keep dashboard logout in the protected shell so users can explicitly end their session.
- **Codex workspace automation** lives under `.codex/` for repo rules, hooks, prompts, custom agents, and architecture docs.

## Seed Dataset

- `npm run db:seed` loads deterministic seed data from `db/seed/`. The settled historical payroll seed window spans `2025-04` through `2025-12`; the seed model also names an open timesheet seed window spanning `2026-01` through `2026-03`.
- `npm run db:seed:workers` is the lightweight production bootstrap: wipe, push schema, then seed only workers and public holidays (no timesheets, payrolls, or advances).
- `npm run db:reset` is the default bootstrap for a seeded app-ready database: wipe, push schema, then seed.
- `db:*` runs Drizzle push, wipe, and seed via `DATABASE_URL` only.
- Every active worker receives seeded monthly timesheets and payroll rows across the settled historical payroll window so payroll, advance, and reporting screens have browseable history.
- Foreign full-time workers keep a live employment minimum of `260`, while payroll vouchers snapshot the month-specific minimum-hours target of `250` or `260`.
- Exactly 5 foreign full-time workers form the quarterly advance cohort; they request a fixed-amount advance once per quarter and repay it over 3 monthly installments in the same quarter.
- Settlement history is intentional: all seeded payroll periods land in `2025`, so the built-in dataset contains only `Settled` payrolls with aligned paid timesheet and advance records. Create Draft payrolls manually when you need draft-state workflows.

## Key file locations

| What | Where |
|---|---|
| Route pages + server actions | `app/dashboard/<feature>/` |
| API routes and shared transport helpers | `app/api/`, `app/api/_shared/` |
| Shared service/use-case modules | `services/<feature>/` |
| Guided workflow snapshot + activity signals | `services/payroll/guided-monthly-workflow.ts`, `services/payroll/guided-monthly-workflow-activity.ts`, `db/tables/guidedMonthlyWorkflowActivityTable.ts` |
| Shared payroll master data | `app/dashboard/payroll/public-holidays/`, `services/payroll/public-holiday-calendar.ts`, `db/tables/publicHolidayTable.ts`, `db/schemas/public-holiday.ts` |
| Shared UI primitives (read-only) | `components/ui/` |
| Data table components | `components/data-table/` |
| Form page shell | `components/form-page-layout.tsx` |
| Third-party integrations (DB, Tailwind `cn`) | `lib/db.ts`, `lib/utils.ts` |
| App utilities and domain helpers | `utils/` grouped: `nav/` (`nav-config.ts`, `dashboard-nav-features.ts`), `time/` (`calendar-date.ts`, `hm-time.ts`, `intl-en-gb.ts`, `iso-local-midnight.ts`), `payroll/` (`payroll-utils.ts`, `parse-attendrecord.ts`, `payroll-period-conflicts.ts`), `advance/` (`queries.ts`) |
| All Drizzle table schemas | `db/tables/` (re-exported via `db/schema.ts`) |
| Drizzle-derived Zod (forms + aligned API bodies) | `db/schemas/` (`worker-employment.ts`, `payroll-period.ts`, `timesheet-entry.ts`, `advance-request.ts`, `api.ts`, …) |
| Domain status enums + badge tones | `types/status.ts`, `types/badge-tones.ts` |
| Seeds | `db/seed/` |
| Schema push | `drizzle.config.ts` via `npm run db:migrate` (`drizzle-kit push`; generated `drizzle/` is gitignored) |
| Codex rules, hooks, agents, prompts | `.codex/rules/`, `.codex/hooks.json`, `.codex/agents/`, `.codex/prompts/` |
| Generated architecture docs | `.codex/docs/data-model-erd.md`, `.codex/docs/api-workflows.md`, `.codex/docs/supabase-rollout-contract.md` |

## Production rollout

- The Supabase production rollout contract lives in `.codex/docs/supabase-rollout-contract.md`.
- Treat that document as draft guidance until a human review is recorded on GitHub issue `#63`.

## Testing

- **Vitest** — node environment, tests co-located with source as `*.test.ts` / `*.test.tsx` under `app/`, `components/`, `utils/`, `lib/`, `db/`, `services/`, `scripts/`. Client/component tests that need DOM set `/** @vitest-environment jsdom */` at the top of the file (see `test/ARCHITECTURE.md`). A few Postgres integration tests are excluded from the default run in `vitest.config.ts`; run them with `npx vitest run <path>` when `DATABASE_URL` points at a real database.
- **Factories** (shared by Vitest) live in `test/factories/`; shared mocks/harnesses in `test/_support/`. Layering and commands are summarized in `test/ARCHITECTURE.md`.
- **`npm run test:coverage`** — Vitest with v8 coverage thresholds on `services/payroll/**` and `services/timesheet/**` (see `vitest.config.ts`).
- **Codex post-change verification** is wired through `.codex/hooks.json`; when product code changes, the stop hook runs `npm run test:unit` (fast Vitest; `npm run test` runs the same default suite).

## Dos

- Compose or wrap shadcn primitives in new files — see `.codex/rules/no-overwrite-shadcn.md`.
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.
- Co-locate feature forms and columns next to their route (e.g. `worker-form.tsx`, `columns.tsx`).
- Validate new structured inputs with Zod at the frontend/backend boundary.
- Route form submissions through server actions; use API routes for non-form/programmatic requests.
- Provide pending, disabled, loading, or Suspense-backed UI for async user flows.
- Use `revalidatePath` after server action mutations.
- Use success/error contracts consistently for server actions and route handlers.
- Use status unions from `types/status.ts` and badge tone maps from `types/badge-tones.ts`.
- Update `AGENTS.md`, `UBIQUITOUS_LANGUAGE.md`, and `.codex/docs/` after schema, API, or domain changes.
- Reference `UBIQUITOUS_LANGUAGE.md` for correct terminology.
