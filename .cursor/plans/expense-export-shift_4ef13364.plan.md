---
name: expense-export-shift
overview: Add Shift Pattern to the New payroll worker selection table, add Submitted-only expense deletion, and add an Expense export Excel download reachable from the Expenses quick actions and list page.
todos:
    - id: shift-pattern-column
      content: Add Shift Pattern to New payroll worker selection data and columns
      status: completed
    - id: expense-delete-api
      content: Implement Submitted-only expense delete service/API and tests
      status: completed
    - id: expense-delete-ui
      content: Add Delete action to the expense row dropdown with locked Paid behavior
      status: completed
    - id: expense-export-api
      content: Implement all-expenses Excel export route using existing xlsx dependency
      status: completed
    - id: expense-export-ui
      content: Add Export expenses entry points to Expenses quick actions and All expenses actions
      status: completed
    - id: domain-docs
      content: Update ubiquitous language and context decisions for expense export and deletion
      status: completed
    - id: verify
      content: Run targeted tests, lint, and typecheck
      status: pending
isProject: false
---

# Expense Export And Shift Pattern Plan

## Scope

- Add `Shift Pattern` to the New payroll worker selection table by extending the existing employment select in [`app/dashboard/payroll/new/page.tsx`](app/dashboard/payroll/new/page.tsx) and reusing the badge pattern already present in [`app/dashboard/worker/all/columns.tsx`](app/dashboard/worker/all/columns.tsx).
- Add a row-menu `Delete` action to [`app/dashboard/expenses/columns.tsx`](app/dashboard/expenses/columns.tsx). It will be enabled only for `Expense Submitted`; `Expense Paid` rows stay locked and must be reverted before deletion.
- Add `DELETE /api/expenses/[id]` in [`app/api/expenses/[id]/route.ts`](app/api/expenses/%5Bid%5D/route.ts), backed by a small expense service that checks status, deletes the row, and revalidates expense paths.
- Add `GET /api/expenses/export` to generate an `.xlsx` file for all expenses using the existing `xlsx` dependency. Per SheetJS docs, the server route can build a workbook with `utils.json_to_sheet`, `utils.book_new`, `utils.book_append_sheet`, and return `write(..., { type: "buffer", bookType: "xlsx" })` with Excel content headers.
- Add an `Export expenses` action to the Expenses quick actions in [`app/dashboard/expenses/expenses-overview-loader.tsx`](app/dashboard/expenses/expenses-overview-loader.tsx), and likely also next to `Add expense` in [`app/dashboard/expenses/all/expenses-all-table-loader.tsx`](app/dashboard/expenses/all/expenses-all-table-loader.tsx) so it is discoverable from the list.
- Update domain docs after implementation: [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md) gets **Expense export**; [`CONTEXT.md`](CONTEXT.md) records that only `Expense Submitted` can be deleted.

## Export Shape

The Excel sheet will include one row per expense and user-facing headers for all fields currently in the expense record/list shape: Expense ID, Supplier, Category, Subcategory, Description, Invoice Number, Supplier GST Registration Number, Subtotal, GST, Grand Total, Invoice Date, Submission Date, Status, Created At, Updated At. Money values will export as SGD decimal amounts, while the database still stores integer cents.

## Tiny Commit Plan

1. Add `shiftPattern` to the New payroll worker query and column type, then render it with `shiftPatternBadgeTone`.
2. Add expense delete service/API behavior with tests for Submitted success, Paid conflict, not found, and unauthenticated access.
3. Add the expense row-menu delete client item with pending state and refresh behavior, disabled for Paid expenses.
4. Add expense export service/API behavior and tests verifying file headers and workbook payload generation path.
5. Add `Export expenses` buttons/links in Expenses quick actions and the All expenses table action area.
6. Update `UBIQUITOUS_LANGUAGE.md` and `CONTEXT.md` for the resolved expense export/deletion language.
7. Run targeted checks: `npx vitest run app/api/expenses`, `npx eslint app/dashboard/payroll/new app/dashboard/expenses app/api/expenses services/expense`, and `npm run typecheck` if time allows.

## Out Of Scope

- No schema change.
- No soft-delete/archive status.
- No filtered/date-range export unless you ask for it later; this plan exports all expenses.
- No changes to default shadcn/ui primitives.
