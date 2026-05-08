# Test architecture (One Laundry)

## Layers

| Layer                         | Location                                    | Asserts                                                                          | Does not assert                                         |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **API route**                 | `app/api/**/route.test.ts`                  | Auth, HTTP status, JSON envelope, `revalidateTransportPaths` / side-effect calls | Full payroll/timesheet business rules (mocked services) |
| **Server action**             | `app/dashboard/**/actions.test.ts`          | `FormData` → service args, `revalidatePath`, redirects                           | Same as above; services hold rules                      |
| **Client fetch**              | `*.client.test.ts` under dashboard          | `fetch` URL/method/body, mapping to UI result shapes                             | Server validation                                       |
| **Service**                   | `services/**/*.test.ts` (non-integration)   | Business rules against mocked `db` / peers                                       | HTTP                                                    |
| **Integration (Postgres)**    | e.g. `services/**/*.integration.test.ts`, some `db/**/*.test.ts` | Real Postgres via `DATABASE_URL`                                        | —                                                       |
| **E2E (browser)**             | `**/*.e2e.test.ts` (e.g. `app/dashboard/worker/worker-crud.e2e.test.ts`) | Full UI flows via [agent-browser](https://agent-browser.dev/) CLI; navigation, forms, screenshots | Unit-isolated business rules (exercise the real app)    |

## E2E (`test/e2e/`, `vitest.e2e.config.ts`)

- **Runner:** `vitest run --config vitest.e2e.config.ts` (`npm run test:e2e`). These files are **excluded** from `vitest.config.ts` so `npm run test:unit` stays fast.
- **CLI:** Use the **project-local** `agent-browser` from `devDependencies` (`node_modules/.bin/agent-browser`, or `npx agent-browser` from the repo root). Do not rely on a globally installed CLI for auth setup. Override the binary path with `AGENT_BROWSER_BIN` if needed.
- **Harness:** `test/e2e/agent-browser.ts` wraps `spawnSync` calls (per-invocation timeout) and shared waits/assertions.
- **Auth:** One-time `npm run test:e2e:setup-auth` saves the `one-laundry` profile using `USERFLOW_BASE_URL`, `USERFLOW_LOGIN_EMAIL`, and `USERFLOW_LOGIN_PASSWORD` from `.env`. That script invokes the local CLI only (see `test/e2e/setup-auth.sh`). Each suite run calls `auth login one-laundry`.
- **Chrome for Testing:** If the CLI cannot find a browser, run **`npx agent-browser install` once** from the repo root (not wired as an npm script). This is separate from `npm install`.
- **Artifacts:** PNG screenshots under `test/e2e/screenshots/` and WebM recordings under `test/e2e/videos/` (gitignored).
- **Hangs / feedback:** Each CLI invocation is capped by **`AGENT_BROWSER_CMD_TIMEOUT_MS`** (default `120000`). A stuck `wait --url` can otherwise block the Node process for a long time and outrun Vitest hook timers. Set **`E2E_AGENT_BROWSER_LOG=1`** for timestamps on each `agent-browser` call and suite `beforeAll` breadcrumbs.

## Shared harness (`test/_support/`)

- `api-auth-mock.ts` — `mockAuthenticatedApiOperator` for route tests; declare `requireCurrentApiUser: vi.fn()` inside `vi.hoisted` (do not import other modules into the hoisted callback — Vitest ESM TDZ).
- `drizzle-mocks.ts` — common Drizzle `select` chain stubs.
- `payroll-command-test-state.ts` — stateful DB simulation for payroll command service tests.
- `mock-fetch-json.ts` — `fetch` stub JSON responses for client tests.

## Factories (`test/factories/`)

Use `@/test/factories`

## Commands

- `npm run test` / `npm run test:unit` — default Vitest (`vitest.config.ts`; excludes `**/*.e2e.test.{ts,tsx}` and Postgres integration paths listed in `postgresIntegrationTestFiles` there).
- `npm run test:e2e` — browser E2E (`vitest.e2e.config.ts`; needs the app, Chrome/`agent-browser`, and a saved auth profile — see **E2E** section above).
- `npm run test:e2e:setup-auth` — save agent-browser profile `one-laundry` from `.env` using the **local** `agent-browser` only (`test/e2e/setup-auth.sh`).
- Postgres integration files — run explicitly when `DATABASE_URL` points at a real instance, e.g. `npx vitest run db/tables/payrollTable.test.ts`.
- `npm run test:coverage` — coverage scoped to `services/payroll/**` and `services/timesheet/**` (see `vitest.config.ts`).

## Auth in API tests

- Most routes: mock `@/app/api/_shared/auth` (`requireCurrentApiUser`).
- Some routes: mock `@/lib/supabase/server` + `getUser`. Mirror the implementation under test.
