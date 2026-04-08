# Plan: Payroll Settle Auto-Download Single-Trigger Fix

> Source PRD: [Issue #42](https://github.com/daniellim922/One-Laundry-Project-Alpha-v1/issues/42)

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep current payroll and advance summary routes; continue using `download=1` as the auto-download intent signal on summary navigation.
- **API boundaries**: Preserve separate contracts for single PDF download and batch ZIP download; do not merge or repurpose these paths.
- **Schema**: No database schema changes. Existing payroll, timesheet, worker, and advance-request structures remain unchanged.
- **Key models**: Retain current domain models for Payroll (`Draft` -> `Settled`), summary document download intent, PDF artifact generation, and ZIP batch download request.
- **Auth and authorization**: Keep session-based auth and existing RBAC checks (`read`/`update`) unchanged.
- **Behavior contract**: Auto-download intent is consumable and one-shot; manual downloads remain user-driven and repeatable; batch ZIP behavior remains unaffected.

---

## Phase 1: One-Shot Auto-Download Trigger

**User stories**: 1, 2, 6, 7, 8, 13

### What to build

Implement a shared one-shot auto-download flow for summary pages that consumes the auto-download intent once and prevents duplicate triggers caused by effect replay, re-render timing, or navigation-side races.

### Acceptance criteria

- [ ] Entering a summary page with `download=1` triggers at most one automatic PDF download attempt.
- [ ] Auto-download intent is consumed from the URL during the same navigation cycle.
- [ ] Effect replay or dependency updates do not trigger a second automatic download attempt.
- [ ] Shared summary behavior is consistent across payroll and advance summary pages.

---

## Phase 2: Auto-Download Failure + Manual Recovery

**User stories**: 3, 4, 5, 9, 10

### What to build

Add explicit failure handling for auto-download attempts and preserve manual download as the primary recovery path, without introducing automatic retries.

### Acceptance criteria

- [ ] Failed auto-download shows an inline, non-blocking error state.
- [ ] Failed auto-download does not loop or auto-retry once the intent has been consumed.
- [ ] Manual download remains available after both successful and failed auto-download attempts.
- [ ] Users can manually download repeatedly, with duplicate in-flight clicks suppressed while generation is pending.

---

## Phase 3: Settle Submit Hardening

**User stories**: 11, 12

### What to build

Harden settle confirmation behavior against duplicate submissions so one user settlement action maps to one settle flow and one downstream auto-download intent.

### Acceptance criteria

- [ ] Rapid or repeated settle-confirm interactions during pending state do not produce duplicate settle submissions.
- [ ] Successful settlement still transitions to summary with the existing one-shot auto-download intent behavior.
- [ ] Existing non-draft/error outcomes remain intact and do not introduce unintended navigation changes.

---

## Phase 4: Regression Safety Net (Deterministic Tests)

**User stories**: 14, 15, 16, 17, 18, 19, 20

### What to build

Add deterministic automated tests that validate one-shot auto-download semantics, manual retry behavior, settle guard resilience, and strict non-regression for ZIP batch download separation.

### Acceptance criteria

- [ ] Tests verify exactly one auto-download invocation per `download=1` trigger.
- [ ] Tests verify intent consumption and no duplicate auto-download on effect replay conditions.
- [ ] Tests verify manual download remains repeatable and recoverable after auto-download failure.
- [ ] Tests verify settle confirmation guard prevents duplicate submission behavior.
- [ ] Tests verify batch ZIP download workflow remains behaviorally unchanged.
