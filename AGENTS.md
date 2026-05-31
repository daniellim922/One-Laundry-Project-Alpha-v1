# AGENTS.md

Workforce payroll and back-office operations app for a laundry business.
Bounded context: **workers, employment, timesheets, payroll, salary advances, operating expenses**.
Domain glossary: `CONTEXT.md`.

## Setup and commands

```bash
npm install                     # install deps
npm run dev                     # dev server (Turbopack)
npm run build                   # production build
npm run lint                    # ESLint (flat config, core-web-vitals + TS)
npm run test                    # unit tests (Vitest; same as test:unit)
npm run test:unit               # Vitest (all unit tests)
npm run test:unit:watch         # Vitest watch mode
npm run test:e2e                # browser E2E (Playwright; see test/ARCHITECTURE.md)
npm run test:e2e:ui             # Playwright UI mode
npm run db:reset                # wipe + push schema + seed (DATABASE_URL)
npm run db:migrate              # drizzle-kit push (db/schema.ts) + custom SQL schema artifacts (DATABASE_URL)
npm run db:seed                 # seed the database (Postgres only; create Auth users in Supabase Studio)
npm run db:seed:prod            # wipe + push schema + custom SQL artifacts + seed workers, public holidays, and Operating Expense master data (DATABASE_URL)
npm run db:wipe                 # wipe database (DATABASE_URL) and Supabase documents storage
```

E2E uses Playwright from this repo's `devDependencies`. If browsers are missing, run **`npx playwright install chromium`** once from the project root.

### File-scoped validation

```bash
npx tsc --noEmit                            # typecheck entire project
npx eslint <file>                           # lint a single file
npx vitest run <path/to/file.test.ts>       # run one Vitest file (co-located with source)
```

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript 5 · PostgreSQL + Drizzle ORM · shadcn/ui (new-york) · Tailwind CSS v4 · TanStack React Table v8 · react-hook-form + Zod · Recharts · Vitest. Payroll and advance voucher PDFs use `@react-pdf/renderer` on the client, upload to Supabase Storage (`documents` bucket), and persist `pdfStoragePath` on each record; downloads stream from storage via API routes (see **PDF storage and downloads** below).

## Architecture

- **Server components by default.** Add `"use client"` only for interactive pieces (forms, tables, dropdowns).
- **Auth entry flow.** `/` redirects to `/login`; `/login` is the public email-and-password sign-in boundary. `proxy.ts` refreshes the Supabase session and redirects unauthenticated requests into `/login` (except `/login` and `/auth/**`).
- **Server actions** live in `actions.ts` files co-located with each feature route under `app/dashboard/<feature>/`. They start with `"use server"`, validate from `FormData`, return `{ success, id? } | { error }`, and call `revalidatePath` after mutations. Keep them for semantic form submissions only; non-form reads, client-triggered commands, imports, exports, PDF/ZIP workflows, and status transitions belong under `app/api/`.
- **Payroll public holidays** live under `app/dashboard/payroll/public-holidays/` as a year-scoped server-action-backed management page. Treat the holiday list as shared payroll master data saved as a full-year replacement update. New Draft payroll creation derives `publicHolidays` from configured holiday dates that match seeded or live timesheet `dateIn` values inside the payroll period, including cross-year periods. Saving a holiday year also refreshes overlapping Draft payroll vouchers in place and revalidates payroll list/detail screens; Settled payrolls stay frozen.
- **API routes** live under `app/api/` for non-form HTTP workflows such as exports and client-triggered mutations. Prefer the shared transport spine in `app/api/_shared/` for authenticated-session checks, JSON responses, and route-level revalidation so handlers stay thin. Protected handlers should call `requireCurrentApiUser()` and return `401` JSON for unauthenticated callers rather than issuing login redirects. Examples: worker mass minimum-hours updates run through `PATCH /api/workers/minimum-working-hours`; timesheet deletion and AttendRecord imports run through `DELETE /api/timesheets/[id]` and `POST /api/timesheets/import`; payroll lazy reads such as revert previews, settlement candidates, and download selections run through `GET /api/payroll/[id]/revert-preview`, `GET /api/payroll/settlement-candidates`, and `GET /api/payroll/download-selection`; payroll and advance downloads run through `GET /api/payroll/[id]/pdf`, `POST /api/payroll/download-zip`, and `GET /api/advance/[id]/pdf`; Operating Expense CRUD and master data management run through `app/api/expenses/` (list/create expenses, per-expense CRUD at `[id]`, status transitions at `[id]/status`, plus category/subcategory/supplier endpoints).
- **PDF storage and downloads** — Client-side generation and upload helpers live in `lib/client/generate-and-upload-pdf.ts`. React PDF document templates live under `services/pdf/react-pdf/` (barrel `services/pdf/react-pdf/index.ts`). Structured data for rendering is served by `GET /api/payroll/[id]/pdf-data` and `GET /api/advance/[id]/pdf-data`. After upload, the client persists the object path with `PATCH /api/payroll/[id]/pdf-storage-path` or `PATCH /api/advance/[id]/pdf-storage-path`. Single-document downloads use `GET /api/payroll/[id]/pdf` and `GET /api/advance/[id]/pdf`, which read `pdfStoragePath` and stream from Supabase Storage (`lib/supabase/storage.ts`). Batch payroll ZIPs use `POST /api/payroll/download-zip`, which pulls stored PDFs server-side and bundles with `archiver`. Records created before PDF storage was enabled have no path and return a JSON error (`PDF_NOT_AVAILABLE`). Summary pages keep Tailwind `print:` styles for manual browser printing only. All `services/pdf/react-pdf/*.tsx` files use the `"use no memo"` directive to opt out of the React Compiler, which inserts hooks that `@react-pdf/renderer`'s custom reconciler cannot handle. `package.json` `overrides` also pin `@react-pdf/reconciler` to `scheduler@0.27.0` to match React 19.2.x / `react-dom`.
- **Service boundary** keeps business rules out of transport code. Shared use-case modules live under `services/<feature>/`; pure calculations and parsers live under `utils/<domain>/`. Server actions and route handlers validate, authorize, adapt inputs, call services, and handle revalidation/HTTP responses. React components collect input and display state; they must not become the source of payroll, timesheet, advance, or operating-expense rules.
- **Guided monthly workflow activity** is month-scoped shared operational guidance keyed by the business timezone month (`Asia/Singapore`). It tracks five steps (mass minimum-hours, timesheet import, draft payroll generation, payroll ZIP download, draft payroll settlement); successful operations emit `guided_monthly_workflow_activity` rows, and the dashboard snapshot derives `done/current/up next`. **Revalidate** `"/dashboard"` in API routes and `createPayroll` actions after these mutations so the home workflow card does not go stale.
- **Input validation** belongs at the boundary. **Persisted shapes** (forms and API bodies that map to Drizzle columns) should use Zod schemas in [`db/schemas/`](db/schemas/) derived from tables with [`drizzle-zod`](https://orm.drizzle.team/docs/zod) (`createInsertSchema` / `createSelectSchema`), following [`db/schemas/worker-employment.ts`](db/schemas/worker-employment.ts). Add business refinements to those shared schemas instead of duplicating validation in UI/actions/routes. Shared HTTP-only contracts for a few routes live in [`db/schemas/api.ts`](db/schemas/api.ts). Keep hand-written Zod for **login**, **external import envelopes** (e.g. AttendRecord JSON), query params, command envelopes, and other shapes with no table mapping.
- **Forms** use react-hook-form + `zodResolver` for complex cases, or plain `useState` + `FormData` for simple ones. All form pages use `FormPageLayout` (back button, title, subtitle, optional actions slot).
- **Data tables** use the shared `DataTable` from `components/data-table/`. Columns are defined in `columns.tsx` next to the route. Use `createSortableHeader`, `createBadgeCell`, `createActionsColumn` from `column-builders.tsx`.
- **Styling** follows the existing shadcn/ui + Tailwind operational dashboard system. Use shared primitives, `cn()`, lucide icons, status badge tone maps, `FormPageLayout` for form pages, and `DataTable` for tabular screens. Keep screens dense, utilitarian, and workflow-focused; avoid marketing-style layouts inside the protected app. Never overwrite original shadcn/ui primitives in `components/ui/`; prefer component props and composition, and avoid wrappers unless they remove repeated feature code.
- **Async UX** must expose loading state. Interactive client components show pending/disabled UI for submits and fetches; async route sections should use Suspense or a route-level loading fallback where the wait is user-visible.
- **Database tables** use `pgTable("snake_case", { ... })` with UUID PKs. Enums are `text(..., { enum: [...] as const })` aligned with `types/status.ts`. Types are exported via `$inferSelect` / `$inferInsert`.
- **Shared domain literals** such as statuses, employment classifications, shift patterns, and payment methods belong in `types/status.ts` as `as const` arrays with exported union types. Reuse those unions in Drizzle tables, Zod schemas, services, and UI rather than duplicating string unions in feature code.
- **Timesheet hours** are schema-owned. `timesheetTable.hours` is a Postgres generated column derived from `dateIn` / `timeIn` / `dateOut` / `timeOut`; application writes and imports should send timestamps only and let the DB compute hours.
- **Shift pattern** on `employment.shiftPattern` (`Day Shift` / `Night Shift`) drives AttendRecord timesheet import and client preview: **Night Shift** re-pairs raw day-column cells into cross-midnight **Timesheet entries**; **Day Shift** keeps same-calendar-date pairing.
- **Database connection and ORM.** `lib/db.ts` uses `DATABASE_URL` for the app, Drizzle Kit (`npm run db:migrate`), wipe, and seed. Hosted Supabase provides Postgres and Auth; Drizzle remains schema and query authority for application data. Use Drizzle query builders for normal app reads/writes and `$inferSelect` / `$inferInsert` for row types. PostgreSQL features that Drizzle does not model directly, such as the payroll worker-period exclusion constraint, are applied by the custom SQL step chained after `drizzle-kit push`. Do not introduce Prisma, raw SQL as the default app-query style, or Supabase table APIs for normal application data access.
- **Voucher numbering.** `payrollVoucherTable.voucherNumber` is a text serial allocated transactionally as a year-scoped formatted value like `2026-0001`; treat it as a human-facing identifier, not a numeric counter in application code.
- **Auth contract.** Any Supabase Auth user who completes `signInWithPassword` with email and password may use the dashboard and API routes; there is no app-level email allowlist. Create users in Supabase Studio (or Auth Admin API) when self-service signup is disabled. Runtime needs `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key; `SUPABASE_SERVICE_ROLE_KEY` is for tooling and server-side admin APIs only, not for normal browser sign-in.
- **Auth session handling.** Cookie-backed Supabase SSR clients live under `lib/supabase/` for browser, server, and proxy contexts. Use `supabase.auth.getUser()` for server-side authorization checks, and keep dashboard logout in the protected shell so users can explicitly end their session.
- **Operating Expenses** are a standalone back-office spend module independent of payroll and workers. Operating Expenses reference **Operating Expense master data** (categories, subcategories, suppliers) managed at `/dashboard/expenses/categories`. The `expensesTable` snapshots master data names at write time (denormalized text, not FK references) so historical records survive renames/deletes. Status labels remain `Expense Submitted ↔ Expense Paid`, but those labels refer to Operating Expenses. Editing is blocked while paid, fully unlocked on revert. The operating-expense overview chart groups monthly spend by supplier (keyed by the triple `supplier + category + subcategory`), with amounts toggleable between Operating Expense Subtotal and Operating Expense Grand Total. API routes for Operating Expenses live under `app/api/expenses/` with CRUD, status transitions, and master data management endpoints.
- **Local agent skills** live under `.agents/skills/`. Treat them as agent workflow instructions, not product architecture or domain documentation.

## Schema And Relations

Drizzle table definitions live in `db/tables/` and are re-exported from `db/schema.ts`. Keep this section aligned with the actual table relations when schema changes.

### Core Relations

- **Worker ↔ Employment**: `worker.employmentId` references `employment.id` with cascade delete. The domain treats this as one current Employment per Worker; Employment is mutable and old Payrolls rely on Payroll voucher snapshots for history.
- **Worker → Timesheet entries**: `timesheet.workerId` references `worker.id` with cascade delete. Timesheet entries are paid/unpaid by Payroll settlement state, not by a direct Payroll foreign key.
- **Worker → Payrolls**: `payroll.workerId` references `worker.id` with cascade delete. A Payroll also references exactly one `payroll_voucher` row through `payroll.payrollVoucherId`.
- **Payroll period invariant**: a Worker must not have overlapping Payroll Pay periods. Drizzle does not model this directly; `db/apply-custom-schema.ts` installs the Postgres exclusion constraint after `drizzle-kit push`.
- **Payroll voucher snapshot**: `payroll_voucher` stores copied Employment terms, calculated amounts, payout details, and `voucherNumber`. Do not join back to current Employment to explain historical settled Payroll figures.
- **Voucher numbering**: `payroll_voucher_counter.year` tracks the year-scoped serial source for voucher numbers.
- **Worker → Advance requests → Installments**: `advance_request.workerId` references `worker.id`; `advance.advanceRequestId` references `advance_request.id`, both with cascade delete. Rows in `advance` are Installments in domain language.
- **Public holiday calendar**: `public_holiday.holiday_date` is unique. It is shared payroll master data, not worker-specific data.
- **Operating Expense master data**: `expense_subcategory.categoryId` references `expense_category.id` with cascade delete. `expense_supplier` is standalone.
- **Operating Expense snapshots**: `expenses` stores `categoryName`, `subcategoryName`, `supplierName`, and `supplierGstRegNumber` as text snapshots. It intentionally has no FK to Operating Expense master data.
- **Guided monthly workflow activity**: `guided_monthly_workflow_activity` is keyed by `monthKey` + `stepId` uniqueness. It records monthly workflow completion signals, not Payroll rows.

### Cross-Record Business Rules

- Settling a Payroll marks covered Timesheet entries as `Timesheet Paid`, marks due Installments as `Installment Paid`, and may move the Advance request to `Advance Paid`.
- Reverting a Payroll moves the Payroll back to `Draft`, returns covered Timesheet entries to `Timesheet Unpaid`, and returns affected Installments to `Installment Loan`.
- Updating current Employment or mass-updating Minimum working hours refreshes affected Draft Payrolls. Settled Payrolls stay frozen through their Payroll voucher snapshots.
- Updating the Public holiday calendar refreshes affected Draft Payrolls only. Settled Payrolls stay frozen.
- Operating Expense category, subcategory, and supplier names are validated against master data at write time, then snapshotted. Later master-data renames/deletes must not rewrite historical Operating Expenses.

### Schema Change Checklist

- Update `db/tables/` and `db/schema.ts` exports together.
- Update table-derived Zod schemas in `db/schemas/` for persisted form/API shapes.
- Update `types/status.ts` and `types/badge-tones.ts` when adding or changing domain statuses/classifications.
- Add or update custom SQL in `db/apply-custom-schema.ts` only for PostgreSQL features Drizzle cannot express cleanly.
- Cover database-owned invariants with focused tests; use Postgres integration tests when the invariant depends on real database behavior.
- Update `CONTEXT.md` only for domain-language changes, not for column-level implementation details.

## Seed Dataset

- `npm run db:seed` loads deterministic seed data from `db/seed/`. The settled historical payroll seed window spans `2025-04` through `2025-12`; the seed model also names an open timesheet seed window spanning `2026-01` through `2026-03`.
- `npm run db:seed:prod` is the lightweight production bootstrap: wipe, push schema, apply the same custom SQL artifacts as `npm run db:migrate`, then seed workers, public holidays, and Operating Expense master data (categories, subcategories, suppliers). It does not load timesheets, payrolls, or advances.
- `npm run db:reset` is the default bootstrap for a seeded app-ready database: wipe, push schema, then seed.
- `db:*` runs Drizzle push, wipe, and seed via `DATABASE_URL` only.
- Every active worker receives seeded monthly timesheets and payroll rows across the settled historical payroll window so payroll, advance, and reporting screens have browseable history.
- Seeded workers **Ashaduzzaman**, **Monir**, and **Yogesh** have **Night Shift** so the deterministic dataset includes rows that match night-shift AttendRecord cell layouts during import testing.
- Foreign full-time workers keep a live employment minimum of `260`, while payroll vouchers snapshot the month-specific minimum-hours target of `250` or `260`.
- Exactly 5 foreign full-time workers form the quarterly advance cohort; they request a fixed-amount advance once per quarter and repay it over 3 monthly installments in the same quarter.
- Settlement history is intentional: all seeded payroll periods land in `2025`, so the built-in dataset contains only `Settled` payrolls with aligned paid timesheet and advance records. Create Draft payrolls manually when you need draft-state workflows.

## Key file locations

| What | Where |
|---|---|
| Route pages + server actions | `app/dashboard/<feature>/` |
| API routes and shared transport helpers | `app/api/`, `app/api/_shared/` |
| Shared service/use-case modules | `services/<feature>/` |
| React PDF voucher templates | `services/pdf/react-pdf/` |
| Supabase Storage helpers (documents bucket) | `lib/supabase/storage.ts` |
| Client PDF generate + upload | `lib/client/generate-and-upload-pdf.ts` |
| Guided workflow snapshot + activity signals | `services/payroll/guided-monthly-workflow.ts`, `services/payroll/guided-monthly-workflow-activity.ts`, `db/tables/guidedMonthlyWorkflowActivityTable.ts` |
| Shared payroll master data | `app/dashboard/payroll/public-holidays/`, `services/payroll/public-holiday-calendar.ts`, `db/tables/publicHolidayTable.ts`, `db/schemas/public-holiday.ts` |
| Operating Expense master data + service | `app/dashboard/expenses/categories/`, `services/expense/`, `db/tables/expenseCategoryTable.ts`, `db/tables/expenseSubcategoryTable.ts`, `db/tables/expenseSupplierTable.ts` |
| Operating Expense API routes | `app/api/expenses/` (CRUD, status transitions, categories, subcategories, suppliers) |
| Shared UI primitives (read-only) | `components/ui/` |
| Data table components | `components/data-table/` |
| Form page shell | `components/form-page-layout.tsx` |
| Third-party integrations (DB, Tailwind `cn`) | `lib/db.ts`, `lib/utils.ts` |
| App utilities and domain helpers | `utils/` grouped: `nav/` (`nav-config.ts`, `dashboard-nav-features.ts`), `time/` (`calendar-date.ts`, `hm-time.ts`, `intl-en-gb.ts`, `iso-local-midnight.ts`), `payroll/` (`payroll-utils.ts`, `parse-attendrecord.ts`, `payroll-period-conflicts.ts`), `advance/` (`queries.ts`) |
| All Drizzle table schemas | `db/tables/` (re-exported via `db/schema.ts`) |
| Drizzle-derived Zod (forms + aligned API bodies) | `db/schemas/` (`worker-employment.ts`, `payroll-period.ts`, `timesheet-entry.ts`, `advance-request.ts`, `expense.ts`, `api.ts`, …) |
| Domain status enums + badge tones | `types/status.ts`, `types/badge-tones.ts` |
| Seeds | `db/seed/` |
| Schema push | `drizzle.config.ts` via `npm run db:migrate` (`drizzle-kit push`; generated `drizzle/` is gitignored) |
| Installed local agent skills | `.agents/skills/` |

## Testing

- **Vitest** — node environment, tests co-located with source as `*.test.ts` / `*.test.tsx` under `app/`, `components/`, `utils/`, `lib/`, `db`, `services`, and `scripts`. Business-rule tests belong at the service or pure utility layer. Route and server-action tests assert HTTP/action contracts, auth, revalidation, redirects, and service calls rather than re-testing full business rules. Client/component tests that need DOM set `/** @vitest-environment jsdom */` at the top of the file. A few Postgres integration tests are excluded from the default run in `vitest.config.ts`; run them with `npx vitest run <path>` when `DATABASE_URL` points at a real database.
- **Playwright E2E** — authenticated browser flows live under `test/playwright/` and run with `npm run test:e2e`; use `npm run test:e2e:ui` for Playwright UI mode. Prereqs: `npm install`, app environment variables, an operator user in Supabase Auth, and optional one-time **`npx playwright install chromium`** if Chromium is missing. Details in `test/ARCHITECTURE.md`.
- **Factories** (shared by Vitest) live in `test/factories/`; shared mocks/harnesses in `test/_support/`. Layering and commands are summarized in `test/ARCHITECTURE.md`.
- **`npm run test:coverage`** — Vitest with v8 coverage thresholds on `services/payroll/**` and `services/timesheet/**` (see `vitest.config.ts`).

## Dos

- Compose or configure shadcn primitives through props and feature components; never overwrite original `components/ui/` primitives.
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.
- Co-locate feature forms and columns next to their route (e.g. `worker-form.tsx`, `columns.tsx`).
- Validate new structured inputs with Zod at the frontend/backend boundary.
- Route form submissions through server actions; use API routes for non-form/programmatic requests.
- Provide pending, disabled, loading, or Suspense-backed UI for async user flows.
- Use `revalidatePath` after server action mutations.
- Use success/error contracts consistently for server actions and route handlers.
- Use status unions from `types/status.ts` and badge tone maps from `types/badge-tones.ts`.
- Update `AGENTS.md`, `CONTEXT.md`, `README.md`, or `test/ARCHITECTURE.md` after schema, API, testing, or domain changes when those docs are affected.
- Reference `CONTEXT.md` for correct domain terminology.

## Cursor Cloud specific instructions

### Hosted Supabase (README default)

Copy `.env.example` → `.env` with `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your project, plus `USERFLOW_LOGIN_EMAIL` / `USERFLOW_LOGIN_PASSWORD` for Playwright. Run `npm run db:reset`, create the Auth user in Supabase Studio, then `npm run dev`. See `README.md`.

### Local Supabase CLI (unattended Cloud Agent / no hosted secrets)

When hosted credentials are not injected, the repo can run fully on **local Supabase** (Postgres `54322`, API `54321`). Dev code already defaults `DATABASE_URL` and `NEXT_PUBLIC_*` to those endpoints when unset (`lib/env.ts`, `lib/env-public.ts`).

**One-time VM prep (not in the update script):** Docker must be running. If `docker` hits permission errors, `sudo chmod 666 /var/run/docker.sock` (or start `dockerd` with `fuse-overlayfs` storage driver in nested VMs — see Cursor Cloud setup notes).

**Per session (after `npm install`):**

1. `npx supabase start` — keep this running.
2. `npm run db:reset` — schema + deterministic seed (37 workers, payroll history, etc.).
3. Create an operator Auth user (example): Admin API `POST http://127.0.0.1:54321/auth/v1/admin/users` with the local `SERVICE_ROLE_KEY` from `npx supabase status -o env`.
4. Optional: create the `documents` storage bucket via Storage API if exercising PDF upload/download.
5. `.env` — at minimum set `USERFLOW_LOGIN_EMAIL` and `USERFLOW_LOGIN_PASSWORD` for Playwright; add explicit `DATABASE_URL` / `NEXT_PUBLIC_*` if you override local defaults or run `npm run build` (production env validation requires public Supabase vars).
6. `npm run dev` (or `npx playwright install chromium` once, then `npm run test:e2e`).

**Lint / unit / build:** `npm run lint`, `npm run test:unit`, `npm run build` (with public Supabase vars in `.env` for production build).

**GUI sign-in caveat:** Headless Chromium against `next dev` may submit the login form before the client bundle hydrates (native GET to `/login?email=...`). Supabase password auth itself works (`curl` to `/auth/v1/token` or Playwright after hydration). Prefer the **Desktop pane** for manual login verification, or wait for client hydration before clicking **Sign in** in automation.

**Quick data smoke test without UI:** query seeded workers, e.g. `npx tsx` + `postgres` client against `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
