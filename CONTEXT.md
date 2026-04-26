# Context

## Decisions

### Employment is a mutable view container

**Status:** Resolved  
Employment exists as a separate table purely for normalization and ease of view. It is **not** a historical contract record. A Worker has exactly one current Employment. Rate changes mutate this record directly; Draft payrolls re-sync from it, while Settled payrolls remain frozen via voucher snapshots.

### Rest-day premium is premium for working on rest days

**Status:** Resolved  
`restDays` on the voucher represents **rest days worked** (typically Sundays worked), inferred as the rest-day budget minus days with no timesheet entry (assumed rest days taken off). The UI allows manual override for edge cases such as 5-Sunday months. The hardcoded budget of 4 should eventually be replaced by dynamic counting of actual rest days in the pay period.

### CPF is a manually-entered flat amount

**Status:** Resolved  
CPF is intentionally modeled as a flat manually-entered amount on Employment, not a computed percentage. This is an operational simplification.

### Paid installments are immutable outside of payroll Reopen

**Status:** Resolved  
Installments in `Installment Paid` status cannot be edited or deleted through the advance request form. The server-side save flow must reject updates that omit or alter paid installments, and matching paid rows should remain stored as-is while only unpaid rows are replaced. The only path back to `Installment Loan` is via payroll `Reopen`, which reverts the entire settled run.

### Timesheet entries are single-day or overnight shifts

**Status:** Resolved  
The timesheet model supports `dateIn`/`dateOut` spanning two calendar days to handle overnight shifts (e.g., 20:00 to 08:00 next day). Rest day and public holiday logic keys off `dateIn` only. Spans beyond two days are accepted as a known edge case that is practically unlikely.

### Timesheet hours must be a faithful derivative of timestamps

**Status:** Resolved  
`timesheetTable.hours` must always equal the computed duration from `dateIn`/`timeIn`/`dateOut`/`timeOut`. The invariant now lives in the database: `hours` is a Postgres generated column, and create/update/import flows write timestamps only. This keeps backfilled legacy rows and future edits structurally aligned without trusting application-side recalculation.

### Unresolved worker matches block timesheet imports

**Status:** Resolved  
An **Unresolved worker match** is an imported timesheet worker name that does not map to exactly one existing active **Worker** by normalized exact name matching. Timesheet imports must not be submitted while any imported worker name remains unresolved; the operator must explicitly map each unresolved name to an active Worker before import. A manual match applies to every row with the same imported worker name in the current file. Multiple imported names may be manually matched to the same **Worker**. The imported worker name remains visible as source evidence, while the selected **Worker** is the identity used for import.

### Inactive workers block new work but preserve existing drafts

**Status:** Resolved  
`Inactive` status must block **new** payroll creation and **new** timesheet entry at the service boundary. Existing Draft payrolls for the worker remain settleable so final pay can be processed. Existing timesheets should be editable until their containing payroll is Settled, after which they are protected by the `Timesheet Paid` flag as usual. The service layer (not just the UI) must enforce the status check.

### Expense module is deferred / out of scope

**Status:** Resolved  
Expenses will become a separate module in the future. The current standalone `expensesTable` should be ignored in payroll domain decisions; no Worker or Payroll allocation is planned at this time.

### Payroll subTotal clamped at zero

**Status:** Resolved  
`subTotal` must never be negative. `hoursNotMetDeduction` is capped so that it cannot exceed `basePayTotal`. `Grand Total` is explicitly allowed to go negative; the business accepts this as unrecoverable debt when a worker has left, and does not pursue external recovery.

### Part-timers are pure hourly with no premiums

**Status:** Resolved — code contradiction found  
Part-time workers earn `hourlyRate × totalHoursWorked` only. No overtime, no rest day pay, no public holiday pay. The current code in `utils/payroll/payroll-utils.ts` incorrectly adds `publicHolidayPay` to part-time earnings; this must be removed. The glossary has been corrected.

### Voucher numbers are year-scoped sequential serials

**Status:** Resolved  
Voucher numbers must be sequential within each calendar year (e.g., `2025-0042`), not random hex-derived values. The current `generateVoucherNumber()` implementation is a placeholder to be replaced.

### Payroll date must be on or after period end

**Status:** Resolved  
`payrollDate` must satisfy `payrollDate >= periodEnd`. Payroll is generated only after the pay period has closed; mid-period advances are handled by the separate Advance module.

### Payroll period overlap is a DB-level invariant

**Status:** Resolved  
The no-overlap rule for pay periods per worker must be enforced by a Postgres exclusion constraint, not just application code. It should be declared in the Drizzle schema (or a tracked raw SQL migration) so it is recreated on `db:migrate`.

### Guided monthly payroll workflow is a calendar-month checklist

**Status:** Resolved  
The dashboard “Guided monthly payroll workflow” is **not** bound to a specific pay period, payroll month, or payroll date. It keys completion off the **current business month** in `Asia/Singapore` and tracks whether the operator performed each action (mass minimum-hours update, timesheet import, draft payroll generation, payroll ZIP download, draft payroll settlement) at least once in that month. A new business month **resets** the visible checklist. Which historical periods payrolls or timesheets refer to is irrelevant to the guide.
