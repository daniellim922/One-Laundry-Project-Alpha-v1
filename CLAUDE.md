# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Workforce payroll and back-office operations app for a laundry business.
Bounded context: **workers, employment, timesheets, payroll, salary advances, expenses, IAM**.
Domain glossary: `.cursor/UBIQUITOUS_LANGUAGE.md` — read it before touching payroll or advance logic.

## Commands

```bash
npm install               # install deps
npm run dev               # dev server (Turbopack)
npm run build             # production build
npm run lint              # ESLint (flat config, core-web-vitals + TS)
npm run test              # all Vitest tests (co-located with source)
npm run test:e2e          # Playwright E2E (auto-starts dev server)
npm run supabase:db:generate  # generate Drizzle migration
npm run supabase:db:migrate   # run migrations
npm run supabase:db:seed      # push schema + seed
npm run supabase:studio       # local Supabase Studio GUI
npm run supabase:db:wipe      # wipe database
```

### Single-file validation

```bash
npx tsc --noEmit                       # typecheck entire project
npx eslint <file>                      # lint a single file
npx vitest run <path/to/file.test.ts>  # run a single test file (tests live next to source)
```

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript 5 · PostgreSQL + Drizzle ORM 0.45.1 · better-auth (session-based, username plugin) · shadcn/ui (new-york) · Tailwind CSS v4 · TanStack React Table v8 · react-hook-form + Zod · Recharts · Vitest + Playwright.

## Architecture

- **Server components by default.** Add `"use client"` only for interactive pieces (forms, tables, dropdowns).
- **Server actions** live in `actions.ts` co-located with each feature route under `app/dashboard/<feature>/`. They start with `"use server"`, validate from `FormData`, return `{ success, id? } | { error }`, and call `revalidatePath` after mutations.
- **Forms** use react-hook-form + `zodResolver` for complex cases, or plain `useState` + `FormData` for simple ones. All form pages use `FormPageLayout` (back button, title, subtitle, optional actions slot).
- **Data tables** use the shared `DataTable` from `components/data-table/`. Columns are defined in `columns.tsx` next to the route. Use `createSortableHeader`, `createBadgeCell`, `createActionsColumn` from `column-builders.tsx`.
- **Database tables** use `pgTable("snake_case", { ... })` with UUID PKs. Enums are `text(..., { enum: [...] as const })` aligned with `types/status.ts`. Types exported via `$inferSelect` / `$inferInsert`.

## Key file locations

| What | Where |
|---|---|
| Route pages + server actions | `app/dashboard/<feature>/` |
| Shared UI primitives (read-only) | `components/ui/` |
| Data table components | `components/data-table/` |
| Form page shell | `components/form-page-layout.tsx` |
| DB, auth, Tailwind `cn` | `lib/db.ts`, `lib/auth.ts`, `lib/auth-client.ts`, `lib/utils.ts` |
| Payroll calculations | `utils/payroll/payroll-utils.ts`, `utils/payroll/parse-attendrecord.ts` |
| Domain status enums + badge tones | `types/status.ts`, `types/badge-tones.ts` |
| All Drizzle table schemas | `db/tables/` (re-exported via `db/schema.ts`) |
| Seeds & migrations | `db/seed/`, `drizzle/` |

## Testing

- **Vitest** — node environment, tests co-located with source as `*.test.ts` / `*.test.tsx` under `app/`, `components/`, `utils/`, `lib/`, `db/`, `services/`, `scripts/`.
- **E2E** — Playwright (Chromium), `test/e2e/*.spec.ts`. Auth setup persists to `test/e2e/.auth/user.json`.
- **Fixtures** in `test/fixtures/`, output in `test/results/`.
- E2E worker tests are deterministic and assume seeded data. Run `npm run supabase:db:seed` first.

## Domain terminology (critical)

- **Settled** applies only to **Payroll**, never to Advances. Advances use **Advance Paid** / **Advance Loan**.
- **Installment** repayment statuses: **Installment Loan** (outstanding) / **Installment Paid** (recovered).
- **Timesheet** settlement: **Timesheet Unpaid** / **Timesheet Paid** (always prefixed to disambiguate).
- **Reopen** reverses a Settled payroll: timesheets revert to Timesheet Unpaid, advance installments revert to Installment Loan.
- **Pay periods** for the same Worker must not overlap across Payroll runs.
- **Workers** are who we pay; **Users** are who log in. A User manages Workers but is not necessarily one.

## Rules

- **Never edit default shadcn/ui components** in `components/ui/`. Compose or wrap them in new files instead. Use `npx shadcn@latest add <component>` for upstream updates.
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.
- Co-locate feature forms (`<feature>-form.tsx`) and table columns (`columns.tsx`) next to their route.
- Use `revalidatePath` after server action mutations.
- Use status unions from `types/status.ts` and badge tone maps from `types/badge-tones.ts`.
