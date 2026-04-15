# Plan: Permission Layer Deprecation

> Source: Derived from grill-me interview on 2026-04-15. No formal PRD; scope captured below.

## Context / PRD summary

Auth was removed in prior phases (commits `88209a8`, `02a90fb`, `6a530ff`). The permission layer remains as dead stubs:

- `requirePermission(feature, action)` returns a hardcoded `{ userId: "open-access" }`.
- `requireApiPermission(request, feature, action)` returns `{ session: null, userId: "open-access" }`.
- `checkPermission(...)` always returns `true`.
- Four IAM tables (`roles`, `features`, `role_permissions`, `user_roles`) are defined but no longer re-exported from `db/schema.ts`.
- `db/seed/iam.ts` defines roles/features but is never invoked.
- No callsite consumes the returned `userId` (grep-verified).

**Goal:** remove the dead permission layer end-to-end — utilities, callsites, DB tables, seed, tests, and docs — leaving the codebase consistent with its current open-access reality.

## Architectural decisions

- **No replacement stubs.** Deleting — not no-op-ing — the permission helpers. If auth returns, it will be reintroduced fresh.
- **DB cleanup via real migration.** Use `npm run db:generate` to produce a Drizzle drop migration for the four IAM tables; commit alongside schema deletion.
- **Tests stay; assertions go.** Preserve business-logic coverage in route/action tests; strip only the `vi.mock` blocks and `toHaveBeenCalledWith` assertions tied to permission helpers.
- **Phase order: leaves → roots.** Callsites first, then utilities, then DB, then docs — each phase leaves `tsc --noEmit` + `vitest` green.

---

## Phase 1: Remove API route permission guards

**Scope:** 13 API routes + their test files + the shared helper module.

### What to build

Strip `requireApiPermission(...)` invocations (and the unused `permission` locals) from all API route handlers under `app/api/`. Remove matching `vi.mock("@/app/api/_shared/auth", ...)` blocks from the paired `*.test.ts` files and any `mocks.requireApiPermission.mockResolvedValue(...)` setup. Once all callsites are gone, delete `app/api/_shared/auth.ts` (both `requireApiPermission` and the also-unused `getApiSession`).

Routes affected:
- `app/api/payroll/download-selection/route.ts`
- `app/api/payroll/download-zip/route.ts`
- `app/api/payroll/settlement-candidates/route.ts`
- `app/api/payroll/settle/route.ts`
- `app/api/payroll/[id]/revert-preview/route.ts`
- `app/api/payroll/[id]/revert/route.ts`
- `app/api/payroll/[id]/settle/route.ts`
- `app/api/payroll/[id]/voucher-days/route.ts`
- `app/api/payroll/[id]/pdf/route.ts`
- `app/api/workers/minimum-working-hours/route.ts`
- `app/api/advance/[id]/pdf/route.ts`
- `app/api/timesheets/import/route.ts`
- `app/api/timesheets/[id]/route.ts`

### Acceptance criteria

- [x] No file imports `requireApiPermission` or `getApiSession`.
- [x] `app/api/_shared/auth.ts` deleted.
- [x] All corresponding `*.test.ts` files pass under `npm run test`.
- [x] `npx tsc --noEmit` clean.
- [x] `npm run lint` clean. (No new errors from this phase; 3 pre-existing unrelated `react-hooks/rules-of-hooks` errors in `components/data-table/column-filter-cell.tsx` remain.)
- [ ] Manual smoke: each affected route still returns the same response shape (hit at least one route per feature via dev server).

---

## Phase 2: Remove dashboard server-component / action guards

**Scope:** 17 pages + actions + 2 action-test files + deletion of `utils/permissions/`.

### What to build

Strip `await requirePermission(...)` lines and their imports from every dashboard page, layout, and server-action file listed below. Verify per-callsite that the returned value is not consumed (expected: it is never destructured today).

Callsites:
- `app/dashboard/advance/new/actions.ts`, `app/dashboard/advance/new/page.tsx`
- `app/dashboard/advance/[id]/edit/actions.ts`, `app/dashboard/advance/[id]/edit/page.tsx`
- `app/dashboard/worker/layout.tsx`, `app/dashboard/worker/new/page.tsx`, `app/dashboard/worker/[id]/edit/page.tsx`, `app/dashboard/worker/actions.ts`
- `app/dashboard/payroll/layout.tsx`, `app/dashboard/payroll/new/page.tsx`, `app/dashboard/payroll/[id]/payroll-detail-data.ts`
- `app/dashboard/timesheet/layout.tsx`, `app/dashboard/timesheet/new/page.tsx`, `app/dashboard/timesheet/[id]/edit/page.tsx`
- `app/dashboard/expenses/layout.tsx`, `app/dashboard/expenses/new/page.tsx`

Update tests:
- `app/dashboard/advance/actions.test.ts` — remove the `requirePermission` mock and assertions; keep business-logic assertions.
- `app/dashboard/worker/actions.test.ts` — same treatment.

After callsites are clean, delete `utils/permissions/permissions.ts`, `utils/permissions/require-permission.ts`, and the `utils/permissions/` directory.

### Acceptance criteria

- [x] No file imports from `@/utils/permissions/*`.
- [x] `utils/permissions/` directory removed.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run test` all clean. (Lint clean for this phase; same 3 pre-existing `react-hooks` errors in `components/data-table/column-filter-cell.tsx` remain from phase 1.)
- [ ] Manual smoke in dev: each dashboard route still loads (`/dashboard/worker`, `/dashboard/payroll`, `/dashboard/timesheet`, `/dashboard/expenses`, `/dashboard/advance`).

---

## Phase 3: Drop IAM database tables + seed

**Scope:** 4 Drizzle table files, 1 seed file, 1 generated migration.

### What to build

Delete the four IAM table definitions under `db/tables/auth/` (`rolesTable.ts`, `featuresTable.ts`, `rolePermissionsTable.ts`, `userRolesTable.ts`) and remove the `db/tables/auth/` directory. `db/schema.ts` already does not re-export them — no change needed there.

Run `npm run db:generate` to emit a Drizzle migration that drops `roles`, `features`, `role_permissions`, and `user_roles`. Commit the generated SQL under `drizzle/`.

Delete `db/seed/iam.ts` (already orphaned; not referenced from `seed.ts`).

### Acceptance criteria

- [ ] `db/tables/auth/` no longer exists.
- [ ] `db/seed/iam.ts` deleted.
- [ ] New migration file in `drizzle/` drops exactly those four tables.
- [ ] `npm run db:migrate` succeeds against a local DB (tables disappear).
- [ ] `npm run db:seed` succeeds end-to-end with no references to removed seed.
- [ ] `npx tsc --noEmit` clean.

---

## Phase 4: Documentation cleanup

**Scope:** 4 markdown files.

### What to build

Update docs to reflect that the app is open-access and no longer has a permission layer.

- `CLAUDE.md` — delete the **Authorization** bullet under Architecture (currently line ~43) describing `requirePermission` / `checkPermission` and feature names.
- `AGENTS.md` — delete the "Open-access guards" bullet (line 46) referencing `requirePermission` / `requireApiPermission`.
- `.codex/docs/api-workflows.md` — remove the line (~26) referencing `requireApiPermission`.
- `.codex/rules/request-boundaries-and-responses.md` — remove the line (~19) referencing `auth.api.getSession` + `checkPermission`.

### Acceptance criteria

- [ ] Final repo-wide grep returns zero matches: `requirePermission | requireApiPermission | checkPermission | getApiSession`.
- [ ] No doc references surviving helpers or feature-name RBAC constants.
- [ ] `npm run build` succeeds.
- [ ] (Optional) `npm run test:e2e` passes against seeded DB.
