# Test architecture (One Laundry)

## Layers

| Layer                         | Location                                    | Asserts                                                                          | Does not assert                                         |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **API route**                 | `app/api/**/route.test.ts`                  | Auth, HTTP status, JSON envelope, `revalidateTransportPaths` / side-effect calls | Full payroll/timesheet business rules (mocked services) |
| **Server action**             | `app/dashboard/**/actions.test.ts`          | `FormData` → service args, `revalidatePath`, redirects                           | Same as above; services hold rules                      |
| **Client fetch**              | `*.client.test.ts` under dashboard          | `fetch` URL/method/body, mapping to UI result shapes                             | Server validation                                       |
| **Service**                   | `services/**/*.test.ts` (non-integration)   | Business rules against mocked `db` / peers                                       | HTTP                                                    |
| **Integration (Postgres)**    | e.g. `services/**/*.integration.test.ts`, some `db/**/*.test.ts` | Real Postgres via `DATABASE_URL`                                        | —                                                       |

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

## Auth in API tests

- Most routes: mock `@/app/api/_shared/auth` (`requireCurrentApiUser`).
- Some routes: mock `@/lib/supabase/server` + `getUser`. Mirror the implementation under test.
