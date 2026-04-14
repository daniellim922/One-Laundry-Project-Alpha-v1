# Plan: Seed Data Refresh

> Source PRD: 12-month seed refresh for payroll, timesheets, and advances covering `2025-04` through `2026-03`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: No new route or UI behavior is required. Existing dashboard flows should continue to read the refreshed seed through the current app surfaces.
- **Schema**: No database schema changes. The refresh must fit the current `Worker`, `Employment`, `Timesheet`, `AdvanceRequest`, `Advance`, `Payroll`, and `PayrollVoucher` tables.
- **Key models**: Worker employment terms remain the source of live defaults; payroll vouchers remain the historical snapshot for period-specific payroll values.
- **Minimum-hours policy**: Minimum-hours enforcement applies to the foreign full-time cohort. Local full-time workers remain outside minimum-hours enforcement. Worker employment stays on a static live minimum-hours value, while payroll vouchers snapshot the month-specific `250` or `260` target.
- **Advance policy**: Advances are seeded only for a fixed foreign-full-time cohort. Local workers never receive seeded advance loans.
- **Settlement policy**: All `2025` payrolls are seeded as `Settled`; all `2026-01` through `2026-03` payrolls are seeded as `Draft`. Timesheet and advance statuses must match those payroll states.
- **Determinism**: The full seed must be stable across runs so tests and manual debugging see the same workers, periods, totals, and statuses each time.
- **Verification**: Seed behavior should be covered by focused generator tests plus a real `db:seed` smoke pass.

---

## Phase 1: 12-Month Seed Backbone

**User stories**: As a developer, I can seed a deterministic dataset from `2025-04` through `2026-03`. As payroll staff, I can browse monthly history for all active workers instead of a one-month demo dataset.

### What to build

Introduce a month-aware seed backbone that generates the full 12-month period range and produces monthly data for every active worker. This slice should prove the app can seed workers, timesheets, advances, and payroll records across the full historical window rather than from a single hard-coded month.

### Acceptance criteria

- [ ] The seed produces monthly periods from `2025-04` through `2026-03` with no missing or extra months.
- [ ] Every active worker receives monthly seed coverage across the full period range.
- [ ] Payroll insertion is enabled again and the seed completes successfully on a clean database.
- [ ] The generated data remains deterministic across repeated runs.

---

## Phase 2: Minimum-Hours Attainment

**User stories**: As payroll staff, I see a realistic dataset where most foreign full-time workers hit their minimum working hours. As a maintainer, the month-length rule is represented consistently in seeded payroll history.

### What to build

Apply the minimum-hours business story to the foreign full-time cohort. Seed timesheets so most worker-months meet target and land slightly above it, while a small fixed set of exceptions miss target. Represent the `250`/`260` month-length rule in payroll-voucher snapshots so historical payroll records reflect the intended target for that month.

### Acceptance criteria

- [ ] Foreign full-time workers are normalized to the agreed live minimum-hours baseline for employment terms.
- [ ] Payroll vouchers snapshot `250` for 30-day months and `260` for 31-day months.
- [ ] Most foreign-full-time worker-months meet target and land within the agreed overtime band above target.
- [ ] Exactly `3` foreign-full-time worker-months intentionally miss target across the 12-month dataset.
- [ ] Local full-time workers remain outside minimum-hours enforcement.

---

## Phase 3: Quarterly Advance Cohort

**User stories**: As payroll staff, I can inspect realistic quarterly advance behavior with 3-month repayment schedules. As a manager, I never see seeded local workers carrying advance loans.

### What to build

Seed a fixed advance cohort within the foreign full-time workers. For each quarter, create one advance request per cohort member and split repayment across the three months of that quarter. This slice should make advance deductions visible in payroll history without making advances universal across the workforce.

### Acceptance criteria

- [ ] Only the fixed 5-worker foreign-full-time cohort receives seeded advances.
- [ ] No local worker receives any seeded advance request or installment.
- [ ] Each quarterly advance request uses the agreed fixed amount and is repaid through 3 monthly installments within the same quarter.
- [ ] Advance history is deterministic and repeats consistently across runs.
- [ ] Payroll periods containing unpaid installments reflect the correct advance deduction totals.

---

## Phase 4: Historical Settlement States

**User stories**: As payroll staff, I see `2025` as fully settled history. As a tester, I still have `2026 Q1` Draft payrolls available for live settlement workflows.

### What to build

Apply the historical status model across payrolls, timesheets, and advances. This slice should seed `2025` as completed operational history and preserve `2026-01` through `2026-03` as open payroll work, with all related statuses aligned to the current settlement rules.

### Acceptance criteria

- [ ] All payrolls in `2025` are seeded as `Settled`.
- [ ] All payrolls in `2026-01` through `2026-03` are seeded as `Draft`.
- [ ] Timesheets inside settled 2025 payroll periods are marked paid.
- [ ] Advance installments inside settled 2025 payroll periods are marked paid, and fully repaid requests are marked paid.
- [ ] Draft 2026 Q1 payroll periods leave related timesheets and installments unpaid.

---

## Phase 5: Seed Verification and Documentation

**User stories**: As a maintainer, I can trust the new seed through targeted tests and smoke checks. As a future contributor, I can understand the seed’s cohort rules and status model quickly.

### What to build

Harden the refreshed seed with focused regression coverage and update project documentation where seed behavior is now materially different. This closes the loop so the seed is not just richer, but also understandable and safe to maintain.

### Acceptance criteria

- [ ] Focused tests cover period generation, cohort selection, minimum-hours attainment, quarterly advances, and settlement-state distribution.
- [ ] A seed smoke run verifies the database can be populated end to end without manual fixes.
- [ ] Documentation reflects the new 12-month historical seed and its major business rules.
- [ ] The refreshed seed remains stable enough to support existing payroll and advance workflows without ad hoc cleanup.
