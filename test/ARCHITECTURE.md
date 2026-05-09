# Test architecture (One Laundry)

## Layers

| Layer                         | Location                                    | Asserts                                                                          | Does not assert                                         |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **API route**                 | `app/api/**/route.test.ts`                  | Auth, HTTP status, JSON envelope, `revalidateTransportPaths` / side-effect calls | Full payroll/timesheet business rules (mocked services) |
| **Server action**             | `app/dashboard/**/actions.test.ts`          | `FormData` → service args, `revalidatePath`, redirects                           | Same as above; services hold rules                      |
| **Client fetch**              | `*.client.test.ts` under dashboard          | `fetch` URL/method/body, mapping to UI result shapes                             | Server validation                                       |
| **Service**                   | `services/**/*.test.ts` (non-integration)   | Business rules against mocked `db` / peers                                       | HTTP                                                    |
| **Integration (Postgres)**    | e.g. `services/**/*.integration.test.ts`, some `db/**/*.test.ts` | Real Postgres via `DATABASE_URL`                                        | —                                                       |
| **Browser E2E (Playwright)** | `test/playwright/**/*.spec.ts`                                  | Authenticated UI flows (Worker overview + CRUD; Timesheet/Advance overview and matrix-create chains wired after Worker matrix create)         | Payroll/timesheet side effects; non-UI invariants        |

## Shared harness (`test/_support/`)

- `api-auth-mock.ts` — `mockAuthenticatedApiOperator` for route tests; declare `requireCurrentApiUser: vi.fn()` inside `vi.hoisted` (do not import other modules into the hoisted callback — Vitest ESM TDZ).
- `drizzle-mocks.ts` — common Drizzle `select` chain stubs.
- `payroll-command-test-state.ts` — stateful DB simulation for payroll command service tests.
- `mock-fetch-json.ts` — `fetch` stub JSON responses for client tests.

## Factories (`test/factories/`)

Use `@/test/factories`

## Commands

- `npm run test` / `npm run test:unit` — default Vitest (`vitest.config.ts`; excludes Postgres integration paths listed in `postgresIntegrationTestFiles` there).
- Postgres integration files — run explicitly when `DATABASE_URL` points at a real instance, e.g. `npx vitest run db/tables/payrollTable.test.ts`.
- `npm run test:coverage` — coverage scoped to `services/payroll/**` and `services/timesheet/**` (see `vitest.config.ts`).
- `npm run test:e2e` — Playwright against `test/playwright` (`playwright.config.ts`). Starts `npm run dev` unless `CI` is set or `reuseExistingServer` finds a server on `USERFLOW_BASE_URL` (see below).
- `npm run test:e2e:ui` — Playwright UI mode for the same suite.

## Playwright browser E2E

- **Config** — `playwright.config.ts` at repo root: **`baseURL` is exactly `USERFLOW_BASE_URL`** (trimmed, no trailing slash) when that env var is non-empty; otherwise it falls back to `http://127.0.0.1:3000`. `testDir` is `test/playwright`, artifacts under `test/playwright/artifacts/` (gitignored). **Video** is recorded for **every** test (`.webm` per test); traces and screenshots are retained on failure.
- **Auth** — `test/playwright/auth.setup.ts` signs in once via `/login` using `USERFLOW_LOGIN_EMAIL` + `USERFLOW_LOGIN_PASSWORD`, then saves storage to `test/playwright/.auth/operator.json` (gitignored). The `chromium` project depends on this setup and reuses that storage state.
- **Prereqs** — `DATABASE_URL` and Supabase env for a working app; operator credentials in `.env` matching a real Auth user; dev server reachable at `USERFLOW_BASE_URL` when not relying on Playwright’s `webServer`. Install browsers once with `npx playwright install chromium` (or `npx playwright install`).
- **Worker E2E fixture** — In this doc, that phrase means **a Worker + Employment row created only for Playwright flows** (e.g. names prefixed like `E2E Worker <timestamp>`), not a new domain concept. Helpers live in `test/playwright/workers/fixtures.ts`; scenarios in `test/playwright/workers/*.spec.ts`.
- **Worker matrix + downstream flows** — Matrix identities live in `test/playwright/workers/workers.json`; created Workers and NRICs are persisted for chained specs in `test/playwright/workers/.matrix-e2e-state.json` (written by `worker-create.spec.ts`). After matrix create, Playwright runs **`matrix-timesheet-create`** (`test/playwright/timesheets/timesheet-create.spec.ts`) and **`matrix-advance-create`** (`test/playwright/advances/advance-create.spec.ts`) before `worker-read`/`worker-delete`, so Workers stay **Active** while adding Timesheet and Advance rows. Shared Playwright helpers: `test/playwright/shared/ui.ts` (generic sidebar/table/combobox/date fills), `test/playwright/shared/matrix.ts` (matrix JSON state + date helpers); feature navigators `test/playwright/timesheets/fixtures.ts`, `test/playwright/advances/fixtures.ts`; overview smoke specs: `timesheets/timesheet-00-overview.spec.ts`, `advances/advance-00-overview.spec.ts`.
- **Duplicate NRIC** — Covered by creating one Worker in the UI, then attempting a second create reusing the same NRIC (no dependency on seed data).

## Auth in API tests

- Most routes: mock `@/app/api/_shared/auth` (`requireCurrentApiUser`).
- Some routes: mock `@/lib/supabase/server` + `getUser`. Mirror the implementation under test.
