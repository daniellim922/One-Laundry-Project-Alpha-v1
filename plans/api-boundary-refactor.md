# Plan: API Boundary Refactor

> Source PRD: Refactor all API endpoints into `app/api` and retain server actions only for form submissions.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep semantic form submissions on server actions. Move non-form client workflows to `app/api` using a hybrid resource + command structure.
- **Schema**: No database schema changes are required for this refactor.
- **Key models**: `Worker`, `Employment`, `Timesheet`, `Payroll`, `PayrollVoucher`, `AdvanceRequest`, `Advance`, `Role`, `User`, `UserRole`.
- **Auth and authorization**: Keep `auth.api.getSession` and feature-based permission checks. Standardize shared permission helpers for API routes.
- **Service boundary**: Business logic moves into feature-scoped service/use-case modules. Server actions and route handlers stay thin transport adapters.
- **API contracts**: New API endpoints return meaningful HTTP status codes and structured JSON error bodies with stable domain codes where needed.
- **Revalidation**: Cache invalidation remains in the transport layer. Server actions revalidate retained form flows; API routes revalidate non-form flows.
- **Testing**: Use TDD with vertical slices. Prioritize high-risk behavior contracts: permission checks, domain transitions, structured errors, payroll synchronization, and revalidation side effects.

---

## Phase 1: Shared API Spine

**User stories**: As a developer, I can add new `app/api` routes on a single auth, permission, response, and revalidation pattern. As a maintainer, I can migrate one workflow without copying transport code.

### What to build

Create the shared transport foundation for the refactor. This phase establishes the durable request/response conventions, permission enforcement pattern, and service extraction pattern that every later phase reuses. It should also extract payroll synchronization behavior out of action modules so feature code no longer depends on another feature's action file.

### Acceptance criteria

- [x] Shared API helpers exist for session lookup, permission enforcement, JSON response shaping, and transport-level revalidation.
- [x] Cross-feature business logic needed by worker, timesheet, and advance flows is callable without importing another feature's action module.
- [x] A first tracer-bullet route and test prove the new route/service pattern works end-to-end.

---

## Phase 2: IAM Non-Form Actions

**User stories**: As an admin, I can ban and unban users through `app/api`. As a maintainer, IAM keeps form submissions as actions but removes non-form RPC-style action usage.

### What to build

Migrate IAM workflows that are triggered from buttons or menu actions rather than form submissions. Keep user and role forms on actions if they remain semantic form submissions, but route non-form user state changes through `app/api` and shared IAM services.

### Acceptance criteria

- [x] Non-form IAM workflows use `app/api` instead of direct server-action RPC.
- [x] IAM form submissions continue to work through server actions with unchanged user-visible behavior.
- [x] IAM permission failures and duplicate/error cases are covered through service or route tests using the new API contract.

---

## Phase 3: Worker Bulk Update

**User stories**: As payroll staff, I can mass-update minimum working hours through `app/api`. As a maintainer, worker create and edit remain action-based because they are form submissions.

### What to build

Move the worker mass-edit workflow onto `app/api` while preserving the current worker create and update forms as action-backed submissions. The slice must include shared worker service logic, API contract handling, and the payroll synchronization side effects that follow successful changes.

### Acceptance criteria

- [x] Mass minimum-hours update is performed through `app/api` with structured success and failure results.
- [x] Worker create and update forms still submit successfully through server actions.
- [x] Payroll synchronization and page invalidation behavior remain correct after worker bulk updates.

---

## Phase 4: Timesheet Non-Form Operations

**User stories**: As payroll staff, I can delete timesheet entries and import timesheets through `app/api`. As a maintainer, create and update timesheet entry remain action-based.

### What to build

Move timesheet workflows that are not semantic form submissions to `app/api`, especially deletion and import flows. Keep create and update entry forms on server actions, but make both transports depend on shared timesheet services with consistent permission, validation, synchronization, and error behavior.

### Acceptance criteria

- [x] Timesheet delete and import workflows use `app/api` without changing the visible UX.
- [x] Timesheet create and update forms still work through server actions.
- [x] Draft payroll synchronization and error handling remain behaviorally correct across both API and action paths.

---

## Phase 5: Advance Service Decoupling

**User stories**: As a manager, I can still create and edit advance requests through form submissions. As a maintainer, advance flows no longer depend on payroll action modules for shared behavior.

### What to build

Refactor advance creation and editing so the transport layer is thin and the business logic is reusable. Keep advance request submission on server actions when it remains a semantic form flow, but remove transport coupling to payroll actions and align advance export routes to shared API helpers where that naturally supports the migration.

### Acceptance criteria

- [x] Advance create and edit flows run through shared services rather than directly coupling to payroll action modules.
- [x] Advance request submission behavior remains unchanged for users.
- [x] Advance-related payroll synchronization and export behavior still works after the decoupling.

---

## Phase 6: Payroll Read APIs

**User stories**: As payroll staff, I can lazily load revert previews, settlement candidates, and download selections through GET `app/api` routes with unchanged UX.

### What to build

Migrate payroll client-triggered reads that currently behave like RPC calls into GET endpoints under `app/api`. Preserve the current lazy-loading UX for previews, dialogs, and selection screens, and ensure the new responses use the standardized API contract.

### Acceptance criteria

- [x] Payroll preview and selection flows load through GET `app/api` routes.
- [x] Existing lazy-loading dialogs and panels continue to behave the same from the user's perspective.
- [x] Read-side route tests cover permission handling, empty states, and structured error responses.

---

## Phase 7: Payroll Command APIs

**User stories**: As payroll staff, I can settle payrolls, revert payrolls, bulk-settle drafts, and update voucher values through command endpoints under `app/api`.

### What to build

Move payroll command-style interactions that are not semantic form submissions into command endpoints under `app/api`. This includes state transitions, inline voucher edits, and batch operations. The slice must preserve domain rules such as overlap handling, settlement side effects, revert previews, and cross-feature status synchronization.

### Acceptance criteria

- [ ] Payroll command workflows use `app/api` with stable HTTP and JSON contracts.
- [ ] Domain transitions preserve current business behavior, including structured conflict and validation errors.
- [ ] High-risk payroll side effects are covered through TDD at the service and route boundary.

---

## Phase 8: Payroll Form Boundary

**User stories**: As payroll staff, I can still create and update payrolls through form submissions. As a maintainer, payroll actions become thin adapters over shared payroll services.

### What to build

Keep genuine payroll form submissions on server actions, but shrink those actions to transport adapters over shared payroll services. This phase finishes the boundary rule so payroll create and update forms remain ergonomic while all non-form client interactions have already moved to `app/api`.

### Acceptance criteria

- [ ] Payroll create and update forms still work through server actions.
- [ ] Payroll actions delegate to shared services instead of containing the bulk of business logic.
- [ ] The boundary is now consistent: form submissions use actions, non-form workflows use `app/api`.

---

## Phase 9: Exports, Regression, and Docs

**User stories**: As payroll staff, PDF and ZIP export flows still work. As a maintainer, existing `app/api` exports are aligned to the shared pattern where useful, tests are migrated, and docs are updated.

### What to build

Stabilize the refactor by aligning existing export routes to shared API helpers where it reduces duplication, completing remaining regression coverage, and updating project documentation to describe the new transport boundary. This phase closes the loop on architectural consistency and developer guidance.

### Acceptance criteria

- [ ] Existing export routes continue to function and are normalized to shared API patterns where it is beneficial.
- [ ] Test coverage reflects the new route and service surfaces rather than the old action-RPC shape.
- [ ] `AGENTS.md`, `UBIQUITOUS_LANGUAGE.md`, and relevant generated architecture docs are updated to match the new boundary.
