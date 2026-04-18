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
npm run test                    # unit tests (Vitest) then E2E (Playwright)
npm run test:unit               # Vitest (all unit tests)
npm run test:unit:watch         # Vitest watch mode
npm run test:unit:worker        # worker-focused Vitest paths
npm run test:e2e                # Playwright E2E
npm run test:e2e:worker         # worker E2E subset
npm run test:e2e:ui             # Playwright UI runner
npm run db:reset                # wipe + push schema + seed (DATABASE_URL)
npm run db:migrate              # drizzle-kit push (db/schema.ts) (DATABASE_URL)
npm run db:seed                 # seed the database (Postgres only; create Auth users in Supabase Studio)
npm run db:wipe                 # wipe database (DATABASE_URL)
```

### File-scoped validation

```bash
npx tsc --noEmit                            # typecheck entire project
npx eslint <file>                           # lint a single file
npx vitest run <path/to/file.test.ts>       # run one Vitest file (co-located with source)
npx playwright test <spec> --project=chromium
```

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript 5 · PostgreSQL + Drizzle ORM · shadcn/ui (new-york) · Tailwind CSS v4 · TanStack React Table v8 · react-hook-form + Zod · Recharts · Vitest + Playwright.

## Architecture

- **Server components by default.** Add `"use client"` only for interactive pieces (forms, tables, dropdowns).
- **Auth entry flow.** `/` remains the marketing landing page, `/login` is the public email-and-password sign-in boundary, and `proxy.ts` refreshes the Supabase session and redirects unauthenticated requests into `/login` (except `/login` and `/auth/**`).
- **Server actions** live in `actions.ts` files co-located with each feature route under `app/dashboard/<feature>/`. They start with `"use server"`, validate from `FormData`, return `{ success, id? } | { error }`, and call `revalidatePath` after mutations. Keep them for semantic form submissions only; non-form payroll reads, commands, and exports belong under `app/api/`.
- **API routes** live under `app/api/` for non-form HTTP workflows such as exports and client-triggered mutations. Prefer the shared transport spine in `app/api/_shared/` for authenticated-session checks, JSON responses, and route-level revalidation so handlers stay thin. Protected handlers should call `requireCurrentApiUser()` and return `401` JSON for unauthenticated callers rather than issuing login redirects. Examples: worker mass minimum-hours updates run through `PATCH /api/workers/minimum-working-hours`; timesheet deletion and AttendRecord imports run through `DELETE /api/timesheets/[id]` and `POST /api/timesheets/import`; payroll lazy reads such as revert previews, settlement candidates, and download selections run through `GET /api/payroll/[id]/revert-preview`, `GET /api/payroll/settlement-candidates`, and `GET /api/payroll/download-selection`; payroll and advance exports run through `GET /api/payroll/[id]/pdf`, `POST /api/payroll/download-zip`, and `GET /api/advance/[id]/pdf`.
- **Service boundary** keeps business rules out of transport code. Shared use-case modules live under `services/<feature>/`; server actions and route handlers should adapt inputs, call services, and handle revalidation.
- **Input validation** belongs at the boundary. **Persisted shapes** (forms and API bodies that map to Drizzle columns) should use Zod schemas in [`db/schemas/`](db/schemas/) derived from tables with [`drizzle-zod`](https://orm.drizzle.team/docs/zod) (`createInsertSchema` / `createSelectSchema`), following [`db/schemas/worker-employment.ts`](db/schemas/worker-employment.ts). Shared HTTP-only contracts for a few routes live in [`db/schemas/api.ts`](db/schemas/api.ts). Keep hand-written Zod for **login**, **external import envelopes** (e.g. AttendRecord JSON), and other shapes with no table mapping.
- **Forms** use react-hook-form + `zodResolver` for complex cases, or plain `useState` + `FormData` for simple ones. All form pages use `FormPageLayout` (back button, title, subtitle, optional actions slot).
- **Data tables** use the shared `DataTable` from `components/data-table/`. Columns are defined in `columns.tsx` next to the route. Use `createSortableHeader`, `createBadgeCell`, `createActionsColumn` from `column-builders.tsx`.
- **Async UX** must expose loading state. Interactive client components show pending/disabled UI for submits and fetches; async route sections should use Suspense or a route-level loading fallback where the wait is user-visible.
- **Database tables** use `pgTable("snake_case", { ... })` with UUID PKs. Enums are `text(..., { enum: [...] as const })` aligned with `types/status.ts`. Types are exported via `$inferSelect` / `$inferInsert`.
- **Database connection.** `lib/db.ts` uses `DATABASE_URL` for the app, Drizzle Kit (`npm run db:migrate`), wipe, and seed. Hosted Supabase provides Postgres and Auth; Drizzle remains schema authority.
- **Auth contract.** Any Supabase Auth user who completes `signInWithPassword` with email and password may use the dashboard and API routes; there is no app-level email allowlist. Create users in Supabase Studio (or Auth Admin API) when self-service signup is disabled. Runtime needs `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key; `SUPABASE_SERVICE_ROLE_KEY` is for tooling and server-side admin APIs only, not for normal browser sign-in.
- **Auth session handling.** Cookie-backed Supabase SSR clients live under `lib/supabase/` for browser, server, and proxy contexts. Use `supabase.auth.getUser()` for server-side authorization checks, and keep dashboard logout in the protected shell so users can explicitly end their session.
- **Codex workspace automation** lives under `.codex/` for repo rules, hooks, prompts, custom agents, and architecture docs.

## Seed Dataset

- `npm run db:seed` loads a deterministic 12-month historical dataset spanning `2025-04` through `2026-03` from `db/seed/`.
- `npm run db:reset` is the default bootstrap for a seeded app-ready database: wipe, push schema, then seed.
- `db:*` runs Drizzle push, wipe, and seed via `DATABASE_URL` only.
- Every active worker receives seeded monthly timesheets and payroll rows across that full window so payroll, advance, and reporting screens have browseable history.
- Foreign full-time workers keep a live employment minimum of `260`, while payroll vouchers snapshot the month-specific minimum-hours target of `250` or `260`.
- Exactly 5 foreign full-time workers form the quarterly advance cohort; they request a fixed-amount advance once per quarter and repay it over 3 monthly installments in the same quarter.
- Settlement history is intentional: all `2025` payroll periods seed as `Settled`, and `2026-01` through `2026-03` seed as `Draft`, with timesheet and advance statuses aligned to those payroll states.

## Key file locations

| What | Where |
|---|---|
| Route pages + server actions | `app/dashboard/<feature>/` |
| API routes and shared transport helpers | `app/api/`, `app/api/_shared/` |
| Shared service/use-case modules | `services/<feature>/` |
| Shared UI primitives (read-only) | `components/ui/` |
| Data table components | `components/data-table/` |
| Form page shell | `components/form-page-layout.tsx` |
| Third-party integrations (DB, Tailwind `cn`) | `lib/db.ts`, `lib/utils.ts` |
| App utilities and domain helpers | `utils/` grouped: `nav/` (`nav-config.ts`, `dashboard-nav-features.ts`), `time/` (`calendar-date.ts`, `intl-en-gb.ts`, `iso-local-midnight.ts`, `local-time.ts`), `payroll/` (`payroll-utils.ts`, `parse-attendrecord.ts`, `payroll-period-conflicts.ts`), `advance/` (`queries.ts`) |
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

- **Vitest** — node environment, tests co-located with source as `*.test.ts` / `*.test.tsx` under `app/`, `components/`, `utils/`, `lib/`, `db/`, `services/`, `scripts/`.
- **E2E** — Playwright (Chromium), files in `test/e2e/` as `*.spec.ts`. Coverage includes the open landing page, the public `/login` boundary, unauthenticated `/dashboard` redirects, and core feature regressions.
- **Fixtures** live in `test/fixtures/`, output in `test/results/`.
- **Codex post-change verification** is wired through `.codex/hooks.json`; when product code changes, the stop hook runs `npm run test:unit` (fast Vitest only; run `npm run test` for the full suite).

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
