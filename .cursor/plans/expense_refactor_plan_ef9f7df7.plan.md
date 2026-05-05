---
name: Expense Refactor Plan
overview: Refactor the expenses module to use text snapshots instead of FK references for category/subcategory/supplier, restructure the categories management page into three flat cards (Category, Sub Category, Supplier) with AlertDialog delete confirmations, introduce a new supplier table, and rearrange the expense form layout.
todos:
    - id: remove-category-type
      content: Remove `type` column from expense_category table, enum, status types, and Zod schemas
      status: completed
    - id: create-supplier-table
      content: Create `expense_supplier` table, Zod schema, service functions, and API routes
      status: completed
    - id: remodel-expenses-table
      content: Replace FK columns with text snapshot columns (categoryName, subcategoryName, supplierName), update Zod schema, save service, and list service
      status: completed
    - id: cascade-delete
      content: Change subcategory FK onDelete from restrict to cascade
      status: completed
    - id: restructure-categories-page
      content: Rebuild categories page with three flat cards (Category, Sub Category, Supplier) + AlertDialog delete confirmations
      status: completed
    - id: rearrange-expense-form
      content: Rearrange expense form layout, wire supplier dropdown, rename labels, move checkbox to bottom
      status: completed
    - id: update-columns-and-detail
      content: Update expense table columns (rename Name to Supplier, remove Type) and detail/edit pages
      status: completed
isProject: false
---

# Expense Module Refactor Plan

## Problem Statement

The current expense module uses FK references to `expense_category` and `expense_subcategory` tables, couples the "Type" (Fixed/Variable) concept to categories unnecessarily, has no Supplier entity, and the UI has layout/naming issues that don't match the desired workflow.

## Solution

Replace FK-based references on the expense record with text snapshots (category name, subcategory name, supplier name). Introduce a new `expense_supplier` table as master data. Restructure the categories management page into three independent management cards. Rearrange the expense form layout.

## Schema Changes

### 1. Remove `type` from `expense_category` table

- Drop the `type` column from [`db/tables/expenseCategoryTable.ts`](db/tables/expenseCategoryTable.ts)
- Remove the `expenseCategoryTypeEnum` from [`db/tables/statusEnums.ts`](db/tables/statusEnums.ts) (and the Postgres enum)
- Remove `EXPENSE_CATEGORY_TYPES` / `ExpenseCategoryType` from [`types/status.ts`](types/status.ts)
- Update [`db/schemas/expense-category.ts`](db/schemas/expense-category.ts) to remove `type` from the form/patch schemas

### 2. Create `expense_supplier` table

- New file `db/tables/expenseSupplierTable.ts` with columns: `id` (UUID PK), `name` (text, not null), `createdAt`, `updatedAt`
- Register in [`db/schema.ts`](db/schema.ts)
- New Zod schema `db/schemas/expense-supplier.ts`

### 3. Remodel `expenses` table columns

In [`db/tables/expensesTable.ts`](db/tables/expensesTable.ts):

- Remove `categoryId` (FK) -> Add `categoryName` (text, not null)
- Remove `subcategoryId` (FK) -> Add `subcategoryName` (text, not null)
- Remove `name` -> Add `supplierName` (text, not null)
- Keep all other columns as-is

This removes all FK constraints from the expenses table to category/subcategory tables.

### 4. Update expense Zod schema

In [`db/schemas/expense.ts`](db/schemas/expense.ts):

- Replace `categoryId` / `subcategoryId` UUID validators with `categoryName` / `subcategoryName` string validators
- Replace `name` with `supplierName`
- Remove the `superRefine` that validates subcategory-to-category FK ownership (no longer needed)
- Remove `createExpenseFormSchema` factory; use a flat schema instead

## API / Service Changes

### 5. New supplier API routes

- `app/api/expenses/suppliers/route.ts` -- GET (list), POST (create)
- `app/api/expenses/suppliers/[id]/route.ts` -- DELETE

### 6. Update category API routes

- [`app/api/expenses/categories/route.ts`](app/api/expenses/categories/route.ts) -- remove `type` from POST body
- [`app/api/expenses/categories/[id]/route.ts`](app/api/expenses/categories/[id]/route.ts) -- remove `type` from PATCH body; update DELETE to cascade-delete subcategories (DB level: change `onDelete: 'restrict'` to `onDelete: 'cascade'` on `expenseSubcategoryTable.categoryId`)

### 7. Update expense list service

[`services/expense/list-expenses.ts`](services/expense/list-expenses.ts):

- Remove `innerJoin` to `expenseCategoryTable` and `expenseSubcategoryTable` -- the names are now directly on the expenses row
- Remove `categoryId` / `subcategoryId` / `categoryType` from the `ExpenseListRow` type
- Read `categoryName`, `subcategoryName`, `supplierName` directly from `expensesTable`
- Update filters to use text matching instead of UUID equality if filtering is still needed

### 8. Update expense save service

[`services/expense/save-expense.ts`](services/expense/save-expense.ts):

- Remove `subcategory-lookup.ts` dependency
- Map `categoryName`, `subcategoryName`, `supplierName` directly into the insert/update

### 9. Update master data service

[`services/expense/list-expense-master-data.ts`](services/expense/list-expense-master-data.ts):

- Add `listExpenseSuppliers()` function
- Keep category/subcategory listing but remove `type` from category ordering

## UI Changes

### 10. Restructure categories management page

Replace [`app/dashboard/expenses/categories/expense-categories-manager.tsx`](app/dashboard/expenses/categories/expense-categories-manager.tsx) with three independent cards:

**Card 1: "Category"**

- Add form: single name input + "Add" button
- Below: list of existing categories, each row showing name + red Trash2 icon
- Trash click opens AlertDialog: "Delete category [name]? The following subcategories will also be deleted: [list]. This action cannot be undone."
- On confirm: DELETE request cascades to subcategories

**Card 2: "Sub Category"**

- Add form: category dropdown (SelectSearch) + name input + "Add" button
- Below: flat list of all subcategories (showing parent category as a badge), each row with red Trash2 icon
- Trash click opens AlertDialog: "Delete subcategory [name]? This action cannot be undone."

**Card 3: "Supplier"**

- Add form: single name input + "Add" button
- Below: list of existing suppliers, each row showing name + red Trash2 icon
- Trash click opens AlertDialog: "Delete supplier [name]? This action cannot be undone."

### 11. Rearrange expense form

In [`app/dashboard/expenses/expense-form.tsx`](app/dashboard/expenses/expense-form.tsx):

**Layout order (top to bottom):**

1. Category + Subcategory (side by side, both SearchSelect)
2. Supplier + Description (side by side; Supplier is SearchSelect populated from supplier master data; Description is text input)
3. Invoice number + Supplier GST registration (side by side, unchanged)
4. Invoice date + Submission date (side by side, moved up from bottom)
5. Amounts card (moved down):
    - Subtotal (SGD), GST 9% (SGD), Grand total (SGD) in 3 columns
    - "Manual GST / grand total override" checkbox moved to bottom of the card
6. Rename "GST (SGD)" label to "GST 9% (SGD)"
7. Submit buttons at the bottom

**Data changes:**

- Supplier dropdown populated from `listExpenseSuppliers()`
- On save, snapshot the selected category name, subcategory name, and supplier name into the expense record

### 12. Update expense table columns

In [`app/dashboard/expenses/columns.tsx`](app/dashboard/expenses/columns.tsx):

- Rename "Name" column to "Supplier" (reads `supplierName`)
- Remove "Type" column (no more category type)
- Keep Category column (reads `categoryName` directly, no join needed)

### 13. Update expense detail/edit pages

- [`app/dashboard/expenses/[id]/page.tsx`](app/dashboard/expenses/%5Bid%5D/page.tsx) -- update field labels
- [`app/dashboard/expenses/[id]/edit/page.tsx`](app/dashboard/expenses/%5Bid%5D/edit/page.tsx) -- pass supplier list, update form binding

## Commits

1. **Remove `type` from expense category schema** -- Drop `type` column from `expenseCategoryTable`, remove `expenseCategoryTypeEnum`, remove `EXPENSE_CATEGORY_TYPES` from status types, update category Zod schemas and API routes. Tests pass.

2. **Create `expense_supplier` table and API routes** -- Add `expenseSupplierTable`, Zod schema, service functions (`listExpenseSuppliers`), and API routes (GET list, POST create, DELETE by id). Tests pass.

3. **Remodel expenses table: FK to text snapshots** -- Replace `categoryId`/`subcategoryId`/`name` columns with `categoryName`/`subcategoryName`/`supplierName` text columns. Update expense Zod schema (remove `createExpenseFormSchema` factory, use flat schema). Update `save-expense.ts` and `list-expenses.ts` to work without joins. Remove `subcategory-lookup.ts`. Tests pass.

4. **Update category delete to cascade subcategories** -- Change `onDelete: 'restrict'` to `onDelete: 'cascade'` on `expenseSubcategoryTable.categoryId`. Verify delete behavior.

5. **Restructure categories management page** -- Replace the nested category/subcategory manager with three flat cards (Category, Sub Category, Supplier). Use AlertDialog for delete confirmations. Category delete dialog lists affected subcategories. All items listed inline below the add form within the same card, with red trash icons.

6. **Rearrange expense form layout** -- Reorder fields (supplier dropdown + description side by side, dates moved up, amounts card moved down, checkbox at bottom). Rename labels. Wire supplier SearchSelect to master data. Snapshot names on save.

7. **Update expense table columns and detail pages** -- Rename "Name" to "Supplier", remove "Type" column, update detail/edit pages to reflect new field names and layout.

## Decision Document

- **Text snapshot model for expense references**: Category, subcategory, and supplier names are stored as plain text on the expense record, not as FKs. This decouples expense history from master data mutations (renames/deletes don't affect historical records). The trade-off is that historical expenses won't auto-update when master data names change -- this is accepted as the desired behavior.
- **Strict dropdown with text storage**: The expense form enforces selection from master data lists (no free text), but stores the resolved name string. This gives input validation without referential coupling.
- **Category type removal**: The Fixed/Variable classification is removed entirely (column + enum + UI). Categories are flat named entities.
- **Cascade delete for categories**: Deleting a category cascades to its subcategories at the DB level. Since expenses no longer FK-reference subcategories, this is safe.
- **Flat subcategory list with category picker**: The Sub Category management card shows a flat list of all subcategories with parent category badges, rather than nesting them under category cards. The add form includes a category dropdown.

## Testing Decisions

- Existing expense API route tests (`app/api/expenses/**/*.test.ts`) will need updates to reflect the new column names and removed FK validations
- New tests for supplier API routes (CRUD)
- Update save-expense service tests for the new schema shape
- Delete cascade behavior should be tested (delete category -> subcategories gone)
- The `subcategory-lookup.ts` and its usage can be deleted (was only needed for FK validation)

## Out of Scope

- Expense reporting or analytics changes
- PDF export changes for expenses (if any exist)
- Migration of existing expense data (this is a schema change that will require `db:reset` or a migration script -- existing expenses will need to be recreated)
- Filtering expenses by category/subcategory in the list view (text-based filtering can be added later if needed)
- Editing categories/subcategories/suppliers inline (the new UI is add + delete only, no rename)
