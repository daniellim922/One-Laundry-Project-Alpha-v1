# AGENTS.md

Workforce payroll and back-office operations app for a laundry business.
Bounded context: **workers, employment, timesheets, payroll, salary advances, expenses, IAM**.
Domain glossary: `.cursor/UBIQUITOUS_LANGUAGE.md`.

## Setup and commands

```bash
npm install               # install deps
npm run dev               # dev server (Turbopack)
npm run build             # production build
npm run lint              # ESLint (flat config, core-web-vitals + TS)
npm run test              # all Vitest tests (unit + integration)
npm run test:unit         # unit tests only
npm run test:e2e          # Playwright E2E (auto-starts dev server)
npm run db:generate       # generate Drizzle migration
npm run db:migrate        # run migrations
npm run db:seed           # push schema + seed
```

### File-scoped validation

```bash
npx tsc --noEmit                       # typecheck entire project
npx eslint <file>                      # lint a single file
npx vitest run test/unit/<file>        # run one test file
```

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript 5 · PostgreSQL + Drizzle ORM · better-auth (session-based, username plugin) · shadcn/ui (new-york) · Tailwind CSS v4 · TanStack React Table v8 · react-hook-form + Zod · Recharts · Vitest + Playwright.

## Architecture

- **Server components by default.** Add `"use client"` only for interactive pieces (forms, tables, dropdowns).
- **Server actions** live in `actions.ts` files co-located with each feature route under `app/dashboard/<feature>/`. They start with `"use server"`, validate from `FormData`, return `{ success, id? } | { error }`, and call `revalidatePath` after mutations.
- **Authorization** is feature-based RBAC. Server components call `requirePermission(featureName, action)` (redirects on fail). API routes use `auth.api.getSession` + `checkPermission`. Feature names: `"Home"`, `"Workers"`, `"Timesheet"`, `"Payroll"`, `"Advance"`, `"Expenses"`, `"IAM (Identity and Access Management)"`.
- **Forms** use react-hook-form + `zodResolver` for complex cases, or plain `useState` + `FormData` for simple ones. All form pages use `FormPageLayout` (back button, title, subtitle, optional actions slot).
- **Data tables** use the shared `DataTable` from `components/data-table/`. Columns are defined in `columns.tsx` next to the route. Use `createSortableHeader`, `createBadgeCell`, `createActionsColumn` from `column-builders.tsx`.
- **Database tables** use `pgTable("snake_case", { ... })` with UUID PKs. Enums are `text(..., { enum: [...] as const })` aligned with `types/status.ts`. Types are exported via `$inferSelect` / `$inferInsert`.

## Key file locations

| What | Where |
|---|---|
| Route pages + server actions | `app/dashboard/<feature>/` |
| Shared UI primitives (read-only) | `components/ui/` |
| Data table components | `components/data-table/` |
| Form page shell | `components/form-page-layout.tsx` |
| Third-party integrations (DB, auth, Tailwind `cn`) | `lib/db.ts`, `lib/auth.ts`, `lib/auth-client.ts`, `lib/utils.ts` |
| App utilities, domain helpers, RBAC | `utils/` grouped: `permissions/` (`permissions.ts`, `require-permission.ts`), `nav/` (`nav-config.ts`, `dashboard-nav-features.ts`), `time/` (`local-iso-date.ts`, `local-time.ts`), `payroll/` (`payroll-utils.ts`, `parse-attendrecord.ts`), `advance/` (`queries.ts`) |
| All Drizzle table schemas | `db/tables/` (re-exported via `db/schema.ts`) |
| Domain status enums + badge tones | `types/status.ts`, `types/badge-tones.ts` |
| Seeds | `db/seed/` |
| Migrations | `drizzle/` |

## Testing

- **Unit/integration** — Vitest, node environment, files in `test/unit/` and `test/integration/` as `*.test.ts`.
- **E2E** — Playwright (Chromium), files in `test/e2e/` as `*.spec.ts`. Auth setup persists storage state to `test/e2e/.auth/user.json`.
- **Fixtures** in `test/fixtures/`, output in `test/results/`.

## Dos

- Compose or wrap shadcn primitives in new files — see `.cursor/rules/no-overwrite-shadcn.mdc`.
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.
- Co-locate feature forms and columns next to their route (e.g. `worker-form.tsx`, `columns.tsx`).
- Use `revalidatePath` after server action mutations.
- Use status unions from `types/status.ts` and badge tone maps from `types/badge-tones.ts`.
- Reference the domain glossary (`.cursor/UBIQUITOUS_LANGUAGE.md`) for correct terminology.
