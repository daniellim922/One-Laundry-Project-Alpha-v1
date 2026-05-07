---
name: Seed shift + expenses
overview: Add Night Shift to Monir and Yogesh in the worker seed, create expense master data seed (categories, subcategories, suppliers from the spreadsheet), and wire it into both seed paths.
todos:
    - id: worker-shift
      content: 'Add shiftPattern: "Night Shift" to Monir and Yogesh in db/seed/workers.ts'
      status: completed
    - id: expense-seed-file
      content: Create db/seed/expense-master-data.ts with categories, subcategories, and suppliers from spreadsheet
      status: completed
    - id: wire-seed
      content: Call seedExpenseMasterData() inside seedWorkersAndHolidays() in db/seed/seed.ts
      status: completed
    - id: update-docs
      content: Update AGENTS.md seed section to reflect expense master data in db:seed:workers
      status: completed
isProject: false
---

# Update Seeds: Shift Patterns + Expense Master Data

## 1. Add Night Shift to Monir and Yogesh

[`db/seed/workers.ts`](db/seed/workers.ts) — Ashaduzzaman already has `shiftPattern: "Night Shift"` (line 102). Add the same field to:

- **Monir** (line 110)
- **Yogesh** (line 123)

No other workers change.

## 2. Create expense master data seed file

New file: [`db/seed/expense-master-data.ts`](db/seed/expense-master-data.ts)

Exports a `seedExpenseMasterData()` async function that inserts:

**Categories** (2):

- Variable
- Fixed

**Subcategories** (9, FK to parent category):

- Variable: Utilities, Fuel Expenses, Chemical, Dry Cleaning Services, Air-Con Servicing, Vehicle Maintenance, Supplies
- Fixed: Monthly Rental, Interest Loan

**Suppliers** (11, independent):

- Mega Gas
- Shell
- Protek Chemicals And Engineering Pte Ltd (GST: M2-0074051-3)
- Diversey (GST: 199700115K)
- Hygold Chemical Supplies (GST: M90357984Y)
- Fabric Pro (GST: 199206791R)
- Hong Air-Con Enterprise (GST: 53447668J)
- Ngee Ngee Motor
- Astral Industries Pte Ltd (GST: 200803694C)
- Singapore Land Authority
- OCBC

Uses `SEED_TIMESTAMP` from [`db/seed/constants.ts`](db/seed/constants.ts) for `createdAt`/`updatedAt`. Inserts categories first, looks up their IDs, then inserts subcategories with the correct `categoryId`.

## 3. Wire into both seed paths

[`db/seed/seed.ts`](db/seed/seed.ts) — call `seedExpenseMasterData()` inside `seedWorkersAndHolidays()` (after public holidays). This automatically covers both:

- `npm run db:seed` (general seed calls `seedWorkersAndHolidays()` then timesheets/advances/payrolls)
- `npm run db:seed:workers` (calls `seedWorkersAndHolidays()` directly via [`db/seed/workers-only.ts`](db/seed/workers-only.ts))

The function name `seedWorkersAndHolidays` becomes slightly misleading after this change, but renaming it would ripple into `workers-only.ts`. We can either rename to `seedWorkersHolidaysAndExpenseMasterData` or keep it as-is with a comment. My recommendation: keep the name and add a comment noting it also seeds expense master data.

## 4. Update docs

- [`AGENTS.md`](AGENTS.md) — note that `db:seed:workers` now also seeds expense master data
- [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md) — no new terms needed (expense master data, categories, subcategories, suppliers are already defined)
