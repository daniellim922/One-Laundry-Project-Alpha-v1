# AGENTS.md

Workforce payroll and back-office operations app for a laundry business.
Bounded context: **workers, employment, timesheets, payroll, salary advances, expenses, IAM**.
Domain glossary: `UBIQUITOUS_LANGUAGE.md`.

## Setup and commands

```bash
npm install                     # install deps
npm run dev                     # dev server (Turbopack)
npm run build                   # production build
npm run lint                    # ESLint (flat config, core-web-vitals + TS)
npm run test                    # all Vitest tests
npm run test:watch              # Vitest watch mode
npm run test:unit               # unit tests only
npm run test:integration        # integration tests only
npm run test:unit:worker        # worker-focused unit tests
npm run test:integration:worker # worker-focused integration tests
npm run test:e2e                # Playwright E2E
npm run test:e2e:worker         # worker E2E subset
npm run test:e2e:ui             # Playwright UI runner
npm run db:studio               # Drizzle Studio
npm run db:generate             # generate Drizzle migration
npm run db:migrate              # run migrations
npm run db:seed                 # push schema + seed
npm run db:wipe                 # wipe database
```

### File-scoped validation

```bash
npx tsc --noEmit                            # typecheck entire project
npx eslint <file>                           # lint a single file
npx vitest run test/unit/<file>             # run one unit test file
npx vitest run test/integration/<file>      # run one integration test file
npx playwright test <spec> --project=chromium
```

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript 5 · PostgreSQL + Drizzle ORM · better-auth (session-based, username plugin) · shadcn/ui (new-york) · Tailwind CSS v4 · TanStack React Table v8 · react-hook-form + Zod · Recharts · Vitest + Playwright.

## Architecture

- **Server components by default.** Add `"use client"` only for interactive pieces (forms, tables, dropdowns).
- **Server actions** live in `actions.ts` files co-located with each feature route under `app/dashboard/<feature>/`. They start with `"use server"`, validate from `FormData`, return `{ success, id? } | { error }`, and call `revalidatePath` after mutations.
- **API routes** live under `app/api/` for non-form HTTP workflows such as auth handlers, exports, and client-triggered mutations. Prefer the shared transport spine in `app/api/_shared/` for session lookup, permission checks, JSON responses, and route-level revalidation so handlers stay thin. Examples: worker mass minimum-hours updates run through `PATCH /api/workers/minimum-working-hours`; timesheet deletion and AttendRecord imports run through `DELETE /api/timesheets/[id]` and `POST /api/timesheets/import`; payroll lazy reads such as revert previews, settlement candidates, and download selections run through `GET /api/payroll/[id]/revert-preview`, `GET /api/payroll/settlement-candidates`, and `GET /api/payroll/download-selection`.
- **Authorization** is feature-based RBAC. Server components call `requirePermission(featureName, action)` (redirects on fail). API routes use `auth.api.getSession` + `checkPermission`. Feature names: `"Home"`, `"Workers"`, `"Timesheet"`, `"Payroll"`, `"Advance"`, `"Expenses"`, `"IAM (Identity and Access Management)"`.
- **Service boundary** keeps business rules out of transport code. Shared use-case modules live under `services/<feature>/`; server actions and route handlers should adapt inputs, call services, and handle revalidation.
- **Input validation** belongs at the boundary. Prefer Zod for API JSON bodies, query/search params, and complex form contracts; avoid adding new ad hoc parsing branches when a schema can express the contract.
- **Forms** use react-hook-form + `zodResolver` for complex cases, or plain `useState` + `FormData` for simple ones. All form pages use `FormPageLayout` (back button, title, subtitle, optional actions slot).
- **Data tables** use the shared `DataTable` from `components/data-table/`. Columns are defined in `columns.tsx` next to the route. Use `createSortableHeader`, `createBadgeCell`, `createActionsColumn` from `column-builders.tsx`.
- **Async UX** must expose loading state. Interactive client components show pending/disabled UI for submits and fetches; async route sections should use Suspense or a route-level loading fallback where the wait is user-visible.
- **Database tables** use `pgTable("snake_case", { ... })` with UUID PKs. Enums are `text(..., { enum: [...] as const })` aligned with `types/status.ts`. Types are exported via `$inferSelect` / `$inferInsert`.
- **Codex workspace automation** lives under `.codex/` for repo rules, hooks, prompts, custom agents, and architecture docs.

## Key file locations

| What | Where |
|---|---|
| Route pages + server actions | `app/dashboard/<feature>/` |
| API routes and shared transport helpers | `app/api/`, `app/api/_shared/` |
| Shared service/use-case modules | `services/<feature>/` |
| Shared UI primitives (read-only) | `components/ui/` |
| Data table components | `components/data-table/` |
| Form page shell | `components/form-page-layout.tsx` |
| Third-party integrations (DB, auth, Tailwind `cn`) | `lib/db.ts`, `lib/auth.ts`, `lib/auth-client.ts`, `lib/utils.ts` |
| App utilities, domain helpers, RBAC | `utils/` grouped: `permissions/` (`permissions.ts`, `require-permission.ts`), `nav/` (`nav-config.ts`, `dashboard-nav-features.ts`), `time/` (`local-iso-date.ts`, `local-time.ts`), `payroll/` (`payroll-utils.ts`, `parse-attendrecord.ts`, `payroll-period-conflicts.ts`), `advance/` (`queries.ts`) |
| All Drizzle table schemas | `db/tables/` (re-exported via `db/schema.ts`) |
| Domain status enums + badge tones | `types/status.ts`, `types/badge-tones.ts` |
| Seeds | `db/seed/` |
| Migrations | `drizzle/` |
| Codex rules, hooks, agents, prompts | `.codex/rules/`, `.codex/hooks.json`, `.codex/agents/`, `.codex/prompts/` |
| Generated architecture docs | `.codex/docs/data-model-erd.md`, `.codex/docs/api-workflows.md` |

## Testing

- **Unit/integration** — Vitest, node environment, files in `test/unit/` and `test/integration/` as `*.test.ts`.
- **E2E** — Playwright (Chromium), files in `test/e2e/` as `*.spec.ts`. Auth setup persists storage state to `test/e2e/.auth/user.json`.
- **Fixtures** live in `test/fixtures/`, output in `test/results/`.
- **Codex post-change verification** is wired through `.codex/hooks.json`; when product code changes, the stop hook runs `npm run test`.

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
