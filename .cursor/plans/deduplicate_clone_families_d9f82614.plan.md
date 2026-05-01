---
name: Deduplicate Clone Families
overview: Reduce ~2,940 duplicated lines (10.9%) across 16 clone families in production code by extracting shared abstractions into co-located shared modules, parameterized components, and utility functions.
todos:
  - id: unit-1
    content: "Worker form: extract repeated money/field sections into parameterized components"
    status: pending
  - id: unit-2
    content: Extract PayrollSelectionPanel shared shell for download + settle panels
    status: pending
  - id: unit-3
    content: "Timesheet import: extract ImportResultSection for repeated result cards"
    status: pending
  - id: unit-4
    content: Extract VoucherInlineEdit shared component for money/number editors
    status: pending
  - id: unit-5
    content: Merge employment bulk selects into generic EnumBulkSelect
    status: pending
  - id: unit-6
    content: Extract StackedBarOverviewCard for dashboard chart cards
    status: pending
  - id: unit-7
    content: "Payroll step progress: refactor to data-driven step rendering"
    status: pending
  - id: unit-8
    content: Extract shared monthly aggregate query helper
    status: pending
  - id: unit-9
    content: Fix remaining small families (PDF routes, worker/timesheet pages, voucher services, seed)
    status: pending
isProject: false
---

# Deduplicate Clone Families

The latest `fallow dupes --mode strict` (production code only, excluding tests) reports **84 clone groups** organized into **16 clone families** totaling ~2,940 duplicated lines across 74 files. This plan groups the families into 9 refactoring units ordered by impact (lines saved), each producing a single commit.

---

## Refactoring Unit 1: Worker Form Repeated Field Sections (128 lines)

**File:** [app/dashboard/worker/worker-form.tsx](app/dashboard/worker/worker-form.tsx) (~1020 lines)

**Problem:** 5 clone groups. Lines 622-817 contain five `Controller` + `Field` + `InputGroup` blocks for numeric inputs (`monthlyPay`, `hourlyRate`, `restDayRate`, `minimumWorkingHours`, `cpf`) that share identical structure: `bindTextNumericField(field)`, `inputMode="decimal"`, `Banknote`/`Clock` addon, `FieldError`, `RequiredMark`. Each block is ~36-40 lines. They differ only in:

- `name` / label / id suffix
- Outer visibility guard (`isFullTime`, `employmentArrangement === "Local Worker"`, or always-visible)
- Icon (`Banknote` vs `Clock`)
- `aria-required` / `RequiredMark` presence
- `inputMode` (`"decimal"` vs `"numeric"`)

**Fix:** Extract a `NumericControllerField` component co-located in the same file (or a sibling) that accepts `name`, `label`, `icon`, `required`, `inputMode`, and `visible` props. Each 36-line block becomes ~6 lines. The component internally renders the `Controller` + `Field` + `InputGroup` + `FieldError` skeleton using `bindTextNumericField`.

**Estimated reduction:** ~120 lines

---

## Refactoring Unit 2: Download Panel / Settle Panel ZIP Progress (79 lines)

**Files:**
- [app/dashboard/payroll/download-payrolls/download-payrolls-panel.tsx](app/dashboard/payroll/download-payrolls/download-payrolls-panel.tsx) (214 lines)
- [app/dashboard/payroll/settle-drafts/settle-draft-payrolls-panel.tsx](app/dashboard/payroll/settle-drafts/settle-draft-payrolls-panel.tsx) (268 lines)

**Problem:** 4 clone groups. Both panels duplicate:
1. **`selectableColumns`** constant -- identical `createRowSelectionColumn` + `baseColumns` (~4 lines x2)
2. **ZIP progress state** -- 8 identical `useState`/`useRef` declarations (`zipDialogOpen`, `zipPhase`, `zipError`, `zipProgress`, `zipTick`, `zipStartedAtRef`, `lastProgressAtRef`, `durationsRef`) (~12 lines x2)
3. **ZIP tick effect + `zipEtaSec` memo** -- identical 250ms interval + `computeZipEtaSec` call (~20 lines x2)
4. **`streamPayrollZipFromApi` progress handler callback** -- identical `meta`/`progress` event handling with `durationsRef` rolling window (~25 lines x2)

They diverge on: data source (`fetchPayrollDownloadSelection` vs `fetchSettlementCandidates`), initial row selection (empty vs all-selected), action flow (direct ZIP vs settle-then-ZIP), button variant/copy, settle-specific warning alert and `CardHeader`.

**Fix:** Extract a `usePayrollZipProgress()` custom hook into [app/dashboard/payroll/_shared/use-payroll-zip-progress.ts](app/dashboard/payroll/_shared/use-payroll-zip-progress.ts) that encapsulates all 8 state variables, the tick effect, `zipEtaSec` memo, `dismissZipDialog`, and returns a `streamWithProgress(ids)` function wrapping the `streamPayrollZipFromApi` callback. Hoist `selectableColumns` into [app/dashboard/payroll/_shared/selectable-columns.ts](app/dashboard/payroll/_shared/selectable-columns.ts). Both panels import the hook and the constant, keeping their domain-specific action handlers and UI.

**Estimated reduction:** ~65 lines

---

## Refactoring Unit 3: Timesheet Import Client Internal Duplication (79 lines)

**File:** [app/dashboard/timesheet/import/timesheet-import-client.tsx](app/dashboard/timesheet/import/timesheet-import-client.tsx) (~1060 lines)

**Problem:** 3 internal clone groups:
1. **Amber callout blocks** (~20 lines x2) -- "Unresolved worker matches" and "Overlapping timesheet dates" use identical `rounded-md border-amber-300 bg-amber-50` container, `font-medium` title, body, bullet list.
2. **`contentEditable` date cells** (~55 lines x2) -- "Date in" and "Date out" columns share identical `onInput` (format + caret), `onBlur` -> `updateEditableRow`, `onPaste` + `execCommand("insertText")`, styling; only field key and `parseDate(row.*)` differ.
3. **`contentEditable` time cells** (~55 lines x2) -- "Time in" and "Time out" nearly identical; time-out adds em-dash handling.

**Fix:**
- Extract an `AmberCallout` component (accepts `title`, `children`) to replace both warning blocks.
- Extract a `ContentEditableDateCell` and `ContentEditableTimeCell` component (or a single `ContentEditableCell` with a `type: "date" | "time"` prop) that encapsulates the `onInput`/`onBlur`/`onPaste`/styling boilerplate, parameterized by `field` key and optional em-dash behavior.

**Estimated reduction:** ~55 lines

---

## Refactoring Unit 4: Voucher Editable Money / Number Components (71 lines)

**Files:**
- [app/dashboard/payroll/[id]/voucher-editable-money.tsx](app/dashboard/payroll/%5Bid%5D/voucher-editable-money.tsx) (170 lines)
- [app/dashboard/payroll/[id]/voucher-editable-number.tsx](app/dashboard/payroll/%5Bid%5D/voucher-editable-number.tsx) (156 lines)

**Problem:** 2 clone groups. Both implement the same "editable voucher cell" pattern:
1. **JSX shell** (~55 lines) -- Outer `div` with `space-y-1`/`fullWidth`/`cursor-not-allowed`, label `<p>`, inner flex row, `Input` with identical `onChange`/`onBlur={commit}`/`onKeyDown` (Enter blur, Escape reset), "Saving..." pending span, red error `<p>`.
2. **Commit skeleton** (~16 lines) -- `readOnly` guard, parse string -> number, `>= 0` check, `setError(null)`, `startTransition(async () => { ... res.error handling ... router.refresh() })`.

They differ in: API call (`requestUpdateVoucherPayRate` vs `updateVoucherDays`), props shape (single `value`/`field` vs dual `restDays`/`publicHolidays`), parser (currency `$` strip vs plain), optional `$` prefix overlay, and text alignment.

**Fix:** Extract a `VoucherEditableField` base component into the same directory that owns the shell JSX, controlled input wiring, commit skeleton, and pending/error UI. It accepts `commitFn: (parsed: number) => Promise<{ error?: string } | void>`, `parse: (text: string) => number | null`, `prefix?: string` (for `$`), and `align?: "left" | "right"`. Both existing components become thin wrappers (~30 lines each) that supply their specific API call and parser.

**Estimated reduction:** ~60 lines

---

## Refactoring Unit 5: Employment Bulk Select Components (70 lines)

**Files:**
- [components/dashboard/employment-arrangement-bulk-select.tsx](components/dashboard/employment-arrangement-bulk-select.tsx) (161 lines)
- [components/dashboard/employment-type-bulk-select.tsx](components/dashboard/employment-type-bulk-select.tsx) (158 lines)

**Problem:** 2 clone groups. Both files are near-identical implementations of the same "bulk select workers by enum dimension" combobox. Shared verbatim: `included()` helper, `sliceBulk()` algorithm, trigger summary logic, the entire `Popover` + `Command` + `CommandList` + `CommandItem` JSX with check/minus icons. They differ only in:
- Enum: `WORKER_EMPLOYMENT_ARRANGEMENTS` vs `WORKER_EMPLOYMENT_TYPES`
- Worker meta field: `employmentArrangement` vs `employmentType`
- Labels/copy: "All arrangements" vs "All types", "Search arrangements..." vs "Search types..."
- Button width: `min-w-40 max-w-64` vs `min-w-36 max-w-56`

**Fix:** Create a generic `EnumBulkSelect<T extends string>` component in [components/dashboard/enum-bulk-select.tsx](components/dashboard/enum-bulk-select.tsx) parameterized by: `enumValues: readonly T[]`, `getWorkerValue: (w: WorkerIdMeta) => T`, `allLabel`, `searchPlaceholder`, `emptyMessage`, `ariaLabel`, `triggerClassName`, and `onBulkChange`. Move `included` and `sliceBulk` into it. Replace both files with thin wrappers (~10 lines each) or delete them and have callers use `EnumBulkSelect` directly with config objects.

**Estimated reduction:** ~130 lines (one full file eliminated)

---

## Refactoring Unit 6: Stacked Overview Cards (63 lines)

**Files:**
- [components/dashboard/monthly-payroll-category-stacked-overview-card.tsx](components/dashboard/monthly-payroll-category-stacked-overview-card.tsx) (~370 lines)
- [components/dashboard/monthly-worker-stacked-amount-overview-card.tsx](components/dashboard/monthly-worker-stacked-amount-overview-card.tsx) (~633 lines)

**Problem:** 2 clone groups. Both cards share: year `Select` + `MonthMultiSelectFilter` header with `onValueChange` reset, `CardDescription`, two-column body (sidebar + chart area), dashed empty-state boxes, `ChartContainer` + `BarChart` with margins/grid/axes/tooltip, mapped `Bar`s with stack/radius animation, `StackedBarMonthTotalLabels`. The category card already imports formatting helpers from the worker card file.

They diverge on: sidebar content (fixed category checkboxes vs employment-grouped workers + search + bulk selects), data derivation, and empty-state copy.

**Fix:** Extract the shared chart shell (year/month header, empty state, `ChartContainer`/`BarChart` wiring with configurable bars) into a `StackedBarChartShell` component in [components/dashboard/stacked-bar-chart-shell.tsx](components/dashboard/stacked-bar-chart-shell.tsx). Both cards render their custom sidebar and pass `data` + `bars` config to the shell. Move the already-shared formatting helpers (`formatStackedChartCurrency`, `formatStackedChartYAxisTick`) into the shell file.

**Estimated reduction:** ~45 lines

---

## Refactoring Unit 7: Payroll Step Progress Internal Duplication (63 lines)

**File:** [app/dashboard/payroll/[id]/payroll-step-progress.tsx](app/dashboard/payroll/%5Bid%5D/payroll-step-progress.tsx) (~586 lines)

**Problem:** 3 internal clone groups:
1. **Settle dialog vs revert dialog** -- Same `Dialog`/`DialogTrigger`/`DialogContent` skeleton, destructive warning strip with `AlertTriangle`, error display, `DialogFooter` with Cancel + action button with pending label.
2. **Timesheet vs advance expanded tables** in `RevertPreviewExpandedLines` -- each branch builds a `Table` with repeated Current/Future status badge columns using same `Badge` + `statusToneMap` markup.
3. **Expandable row vs collapsed row** status badges -- Status badges appear twice with identical markup (~20 lines).

**Fix:** Extract a `ConfirmActionDialog` sub-component (accepts `trigger`, `title`, `description`, `warningText`, `actionLabel`, `pendingLabel`, `onConfirm`, `error`) to replace the settle/revert dialog duplication. Extract a `StatusBadgePair` component for the repeated Current/Future status badge columns. Use `.map()` over a status-columns config for the table headers.

**Estimated reduction:** ~45 lines

---

## Refactoring Unit 8: Payroll Aggregates Query Duplication (43 lines)

**Files:**
- [app/dashboard/get-payroll-monthly-category-aggregates.ts](app/dashboard/get-payroll-monthly-category-aggregates.ts) (~88 lines)
- [app/dashboard/payroll/get-payroll-monthly-grand-total-aggregates.ts](app/dashboard/payroll/get-payroll-monthly-grand-total-aggregates.ts) (~66 lines)

**Problem:** Both share: Drizzle imports, `payrollDashboardYearWindow()` + `payrollPeriodEndYearMonthExtract()` calls, the same base query shape (`db.select(...).from(payrollTable).innerJoin(payrollVoucherTable).innerJoin(workerTable).innerJoin(employmentTable).where(settledPayrollOverlappingYearsWhere(...))`), and the `{ defaultYear, yearOptions, rows }` return shape. They diverge on: selected columns (`sum(case ...)` category measures vs `sum(grandTotal)`/`sum(subTotal)`), `groupBy` (year/month vs worker+employment+year/month), and optional named-worker SQL.

**Fix:** Extract the shared year-window setup, base query joins, and return-shape construction into a `buildPayrollAggregateQuery` helper in [app/dashboard/_shared/payroll-aggregate-base.ts](app/dashboard/_shared/payroll-aggregate-base.ts). Both callers supply their specific `select` columns and `groupBy` clauses.

**Estimated reduction:** ~30 lines

---

## Refactoring Unit 9: Remaining Small Families (~170 lines combined)

These are smaller families that share common patterns:

**9a. PDF route handlers** (28 lines)
- `app/api/advance/[id]/pdf/route.ts` and `app/api/payroll/[id]/pdf/route.ts`
- Both share: auth check, `getRequestOrigin`, `generatePdf({ url, cookieHeader })`, `pdfAttachmentResponse`. Differ in: entity table, print URL, filename template.
- **Fix:** Extract `handlePdfExport(req, ctx, { buildUrl, fetchMeta, buildFilename })` into [app/api/_shared/pdf-export-handler.ts](app/api/_shared/pdf-export-handler.ts). Each route becomes a ~15-line config object + handler call.

**9b. Worker edit/view pages** (42 lines)
- `app/dashboard/worker/[id]/edit/page.tsx` and `app/dashboard/worker/[id]/view/page.tsx`
- Both share: identical `db.select` joining `workerTable` + `employmentTable` with same field list, `notFound()`, `FormPageLayout` + `EntityStatusBadge` + `WorkerForm`.
- **Fix:** Extract `loadWorkerById(id)` into [app/dashboard/worker/[id]/_shared/load-worker.ts](app/dashboard/worker/%5Bid%5D/_shared/load-worker.ts). Both pages call it and pass the result to `WorkerForm`.

**9c. Timesheet edit/view pages** (29 lines)
- `app/dashboard/timesheet/[id]/edit/page.tsx` and `app/dashboard/timesheet/[id]/view/page.tsx`
- Same pattern: `db.select` from `timesheetTable`, `notFound()`, worker dropdown query, `TimesheetEntryForm`.
- **Fix:** Extract `loadTimesheetById(id)` into [app/dashboard/timesheet/[id]/_shared/load-timesheet.ts](app/dashboard/timesheet/%5Bid%5D/_shared/load-timesheet.ts).

**9d. Update voucher days/rates services** (70 lines)
- `services/payroll/update-voucher-days.ts` (161 lines) and `services/payroll/update-voucher-pay-rates.ts` (220 lines)
- Both share: discriminated `Update*Result` type, missing-id guard, load payroll -> not found / voucher mismatch / not Draft check, load voucher, `buildDraftPayrollVoucherValues` + `db.update(payrollVoucherTable).set(...)` + try/catch + success payload.
- **Fix:** Extract the shared guard-load-update pipeline into `executeVoucherUpdate(payrollId, voucherId, buildUpdateValues)` in [services/payroll/_shared/voucher-update-pipeline.ts](services/payroll/_shared/voucher-update-pipeline.ts). Both services become thin wrappers that supply their field-specific validation and value-building logic.

**9e. Voucher details card sections** (35 lines)
- `app/dashboard/payroll/[id]/breakdown/voucher/voucher-details.tsx` (195 lines)
- Three successive `Card` + `CardHeader` + `CardContent` + grid blocks with same structure.
- **Fix:** Extract a `VoucherDetailSection` component accepting `title` and `gridCols`, then render children. Reduces each section from ~12 lines to ~3 lines.

**9f. Seed timesheet** (32 lines)
- `db/seed/timesheet.ts` -- repeated `roundTo15` + clock-in/out + `entries.push(...)` for part-time, foreign FT, and exception locals.
- **Fix:** Extract a `buildTimesheetEntry(workerIndex, dateIn, clockInMinutes, durationMinutes, status)` local function that handles the shared clock-out derivation and `entries.push`.

**Estimated reduction (9a-9f combined):** ~150 lines

---

## Summary

- **Total estimated reduction:** ~700 net lines removed
- **New shared files:** ~10 (co-located under `_shared/` within their feature directories)
- **Files eliminated:** 1 (one bulk select component becomes unnecessary)
- **Post-refactor target:** Duplication drops from ~2,940 lines (10.9%) to under ~2,200 lines (<8.5%)

The `_shared/` folder convention is used for co-located shared modules within feature directories. Run `npm run test:unit` after each unit to verify behavior preservation, and `npx fallow dupes --mode strict` after all units to confirm the duplication percentage drops.