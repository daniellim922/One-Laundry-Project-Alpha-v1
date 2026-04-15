# Plan: Remove Auth and IAM

> Source PRD: GitHub issue #54 - https://github.com/daniellim922/One-Laundry-Project-Alpha-v1/issues/54

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep `/` as the landing page. Keep `/login` as a UI-only gateway form. Make `/dashboard` directly accessible. Remove IAM and auth API routes rather than redirecting them.
- **Schema**: Remove auth and IAM tables from the live Drizzle schema. Payroll, worker, timesheet, advance, and expense tables remain intact.
- **Key models**: Keep `Worker`, `Employment`, `Timesheet`, `Payroll`, `PayrollVoucher`, `AdvanceRequest`, `Advance`, and `Expense`. Remove `User`, `Session`, `Account`, `Verification`, `Role`, `Feature`, `RolePermission`, and `UserRole`.
- **Authentication and authorization**: No replacement access-control layer will be introduced. The app becomes fully open for internal use.
- **Transport boundary**: Dashboard routes, server actions, and internal APIs no longer require session lookup or permission checks.
- **Navigation and UX**: All non-IAM features remain visible. Session-backed user chrome and logout affordances are removed.
- **Testing**: Delete auth- and RBAC-only coverage. Rebuild verification around open-access behavior and the fake `/login` flow.

---

## Phase 1: Open Entry Flow

**User stories**: As an internal operator, I can enter the app without real authentication. As a maintainer, the product keeps its landing page and `/login` route without keeping backend auth.

### What to build

Convert the entry flow to the new product behavior. The landing page remains unchanged in role, `/login` becomes a client-side gateway form, and `/dashboard` becomes directly accessible without session state.

### Acceptance criteria

- [x] `/` still renders as the public landing page.
- [x] `/login` accepts any non-empty username and password and routes to `/dashboard`.
- [x] `/dashboard` is directly accessible even if `/login` was never visited.

---

## Phase 2: Remove Runtime Gates

**User stories**: As an operator, I can open dashboard pages and use internal APIs without identity or permission errors. As a maintainer, route and API transport code no longer depends on auth helpers.

### What to build

Remove authentication and authorization enforcement from the runtime boundary. This slice should make dashboard layouts, server actions, and internal APIs operate without session lookup, permission checks, return-url handling, or session forwarding.

### Acceptance criteria

- [x] Dashboard routes render without any session or permission dependency.
- [x] Internal APIs no longer return auth- or permission-related failures.
- [x] No remaining runtime path depends on session retrieval or feature permission checks.

---

## Phase 3: Delete IAM Surface

**User stories**: As an operator, I no longer see IAM in the app. As a maintainer, the repo no longer carries dead user, role, ban, or permission management flows.

### What to build

Remove the IAM product surface end-to-end. This includes IAM navigation, pages, API commands, service logic, and any user-management behavior that only exists to support auth and RBAC.

### Acceptance criteria

- [ ] IAM no longer appears in dashboard navigation or breadcrumbs.
- [ ] IAM pages and APIs are removed and no longer accessible.
- [ ] No remaining user-management workflow exists for bans, roles, or feature permissions.

---

## Phase 4: Simplify Open Dashboard UX

**User stories**: As an operator, I see the full non-IAM app without permission-based hiding. As a maintainer, navigation and action visibility are no longer tied to a user identity.

### What to build

Simplify dashboard presentation for the new open-access model. All non-IAM feature areas and their actions should be visible without role filtering, and user-specific sidebar chrome should be removed.

### Acceptance criteria

- [ ] Non-IAM navigation items are always shown.
- [ ] Remaining create, update, delete, and export controls are no longer permission-gated.
- [ ] No current-user card, logout action, or account menu remains in the dashboard shell.

---

## Phase 5: Remove Auth and IAM Data Model

**User stories**: As a maintainer, the live schema matches the auth-free product. As an operator, database setup and seeds no longer depend on users, roles, or sessions.

### What to build

Delete auth and IAM tables from the schema and align database setup with the new product boundary. Remove auth-specific seed data, credential personas, and environment requirements while preserving the payroll and operations dataset.

### Acceptance criteria

- [ ] Auth and IAM tables are no longer part of the live Drizzle schema.
- [ ] Database setup succeeds without seeded users, roles, permissions, or credential env vars.
- [ ] Remaining seed data still supports worker, timesheet, payroll, advance, and expense workflows.

---

## Phase 6: Remove Auth Tooling and Dependencies

**User stories**: As a maintainer, the repository no longer carries unused auth libraries or auth-specific test harnesses. As a contributor, local setup reflects the new open-access architecture.

### What to build

Clean out auth-specific tooling, dependencies, and automated setup. Remove the auth library integration, auth clients, Playwright auth bootstrap, and any test helpers that exist only for sessions or RBAC personas.

### Acceptance criteria

- [ ] `better-auth` and related runtime plumbing are removed.
- [ ] Playwright no longer depends on authenticated storage state or seeded credentials.
- [ ] No auth- or RBAC-only test helper remains in active use.

---

## Phase 7: Regression Coverage and Documentation

**User stories**: As a maintainer, the repo documentation and tests describe the new auth-free architecture accurately. As an operator, the main flows remain verifiable after the removal.

### What to build

Stabilize the removal by updating verification coverage and repository documentation. The final slice should leave the codebase, tests, and project guidance consistent with the open-access product shape.

### Acceptance criteria

- [ ] Remaining tests validate open-access entry and core dashboard flows.
- [ ] Auth- and IAM-specific documentation is removed or rewritten.
- [ ] `AGENTS.md`, glossary references, and generated architecture docs describe the auth-free system accurately.
