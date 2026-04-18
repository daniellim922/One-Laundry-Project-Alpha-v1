# One Laundry API Workflows

This document maps the live `app/api/` surface with Supabase email-and-password auth.

## API Inventory

| Route | Method | Access model | Purpose |
|---|---|---|---|
| `/api/advance/[id]/pdf` | `GET` | Authenticated session required | Generate printable advance summary PDF |
| `/api/payroll/[id]/revert-preview` | `GET` | Authenticated session required | Lazy-load the revert impact preview for the payroll detail dialog |
| `/api/payroll/[id]/revert` | `POST` | Authenticated session required | Reopen a Settled payroll and unwind timesheet + advance recovery |
| `/api/payroll/[id]/settle` | `POST` | Authenticated session required | Settle a single Draft payroll run |
| `/api/payroll/[id]/voucher-days` | `PATCH` | Authenticated session required | Update voucher day-count fields; current payroll detail UI uses it for `restDays`, while newly created Draft payroll `publicHolidays` are computed from the shared holiday calendar |
| `/api/payroll/[id]/pdf` | `GET` | Authenticated session required | Generate payroll summary or voucher PDF |
| `/api/payroll/download-selection` | `GET` | Authenticated session required | Lazy-load payroll rows for the download-selection dialog |
| `/api/payroll/download-zip` | `POST` | Authenticated session required | Bundle multiple payroll PDFs into a ZIP |
| `/api/payroll/settle` | `POST` | Authenticated session required | Bulk-settle multiple Draft payrolls from the settlement dialog |
| `/api/payroll/settlement-candidates` | `GET` | Authenticated session required | Lazy-load Draft payroll rows for the bulk-settlement dialog |
| `/api/timesheets/[id]` | `DELETE` | Authenticated session required | Delete a timesheet entry from row actions and re-sync draft payrolls |
| `/api/timesheets/import` | `POST` | Authenticated session required | Import AttendRecord-style timesheets and re-sync draft payrolls |
| `/api/workers/minimum-working-hours` | `PATCH` | Authenticated session required | Bulk-update minimum working hours for active full-time workers and re-sync draft payrolls |

## Access Contract

- Every live route performs an explicit authenticated-session check through `requireCurrentApiUser()`.
- Unauthenticated API callers receive `401` JSON shaped as `{ ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }`.
- Protected dashboard page requests redirect into `/login`; protected API routes do not issue HTML redirects.

## Request validation (Drizzle-aligned Zod)

- `POST /api/payroll/settle`, `PATCH /api/payroll/[id]/voucher-days`, and `PATCH /api/workers/minimum-working-hours` validate JSON bodies with [`db/schemas/api.ts`](../../db/schemas/api.ts) (`drizzle-zod` `createSelectSchema`, with explicit `z.number()` overrides where nullable columns must be required in the HTTP contract).
- `POST /api/timesheets/import` keeps a hand-written envelope schema for the external AttendRecord shape; after normalizing each row, the service also validates worker/date/time fields with [`db/schemas/timesheet-entry.ts`](../../db/schemas/timesheet-entry.ts).

## Advance PDF Export

```mermaid
flowchart TD
    A[Client GET /api/advance/:id/pdf] --> B[requireCurrentApiUser]
    B -->|unauthorized| X[401 JSON error]
    B --> C[Load advance request + worker metadata]
    C --> D[Build internal summary URL with print=1]
    D --> E[Launch Playwright chromium]
    E --> F[Open summary page and wait for networkidle]
    F --> G[Wait for fonts and render PDF]
    G --> H[Return application/pdf attachment]
```

## Payroll PDF Export

```mermaid
flowchart TD
    A[Client GET /api/payroll/:id/pdf] --> B[requireCurrentApiUser]
    B -->|unauthorized| X[401 JSON error]
    B --> C[Read mode query param]
    C --> D[Load payroll + worker metadata]
    D --> E[Build summary or voucher print URL]
    E --> F[Launch Playwright chromium]
    F --> G[Open print page and wait for fonts]
    G --> H[Render PDF]
    H --> I[Return application/pdf attachment]
```

## Payroll Mutation Pattern

```mermaid
flowchart TD
    A[Client POST or PATCH payroll command] --> B[requireCurrentApiUser]
    B -->|unauthorized| X[401 JSON error]
    B --> C[Validate body or params]
    C --> D[Call payroll service]
    D -->|domain conflict| E[409 JSON error]
    D -->|record missing| F[404 JSON error]
    D --> G[Persist payroll changes]
    G --> H[Revalidate payroll, timesheet, and advance routes]
    H --> I[200 JSON success]
```

## Timesheet Import Pattern

```mermaid
flowchart TD
    A[Client POST /api/timesheets/import] --> B[requireCurrentApiUser]
    B -->|unauthorized| X[401 JSON error]
    B --> C[Parse JSON body with AttendRecord schema]
    C -->|invalid body| D[400 JSON validation error]
    C --> E[services/timesheet/import-attend-record-timesheet]
    E --> F[Insert imported timesheet rows]
    F --> G[Synchronize affected worker draft payrolls]
    G --> H[Revalidate timesheet + payroll dashboard paths]
    H --> I[200 JSON success with imported count and errors]
```

## ZIP Payroll Export

```mermaid
flowchart TD
    A[Client POST /api/payroll/download-zip] --> B[requireCurrentApiUser]
    B -->|unauthorized| X[401 JSON error]
    B --> C[Parse and dedupe payrollIds]
    C --> D[Load payroll metadata for filenames and ZIP date range]
    D --> E[Fetch internal /api/payroll/:id/pdf responses]
    E --> F[Append PDF buffers to ZIP stream]
    F --> G[Attach _download-errors.txt when any PDF fails]
    G --> H[Return application/zip attachment]
```

## Runtime Notes

- All document/export routes declare `runtime = "nodejs"`.
- JSON command routes prefer the shared transport helpers in `app/api/_shared/` for authenticated-session enforcement, response shaping, and revalidation handling.
- Bulk worker minimum-hours updates stay action-free on the client side: the dashboard dialog calls the route, while worker create and edit forms remain server-action submissions.
- Payroll public-holiday calendar management currently stays on the server-action side of the transport split under `app/dashboard/payroll/public-holidays`; there is no dedicated `app/api` route for the year-save workflow yet.
- Payroll revert preview, bulk settlement candidate loading, payroll download selection, payroll settle/revert commands, voucher-day edits, and export flows now run through `app/api`; only payroll create and update remain server-action form submissions.
- Timesheet delete and AttendRecord import now call `app/api` from client components, while timesheet create and edit remain server-action submissions.
- Dashboard form submissions still perform their own `requireCurrentDashboardUser()` check, so route protection does not rely on `proxy.ts` alone.
- PDF generation relies on Playwright-driven rendering of existing dashboard summary pages.
- ZIP creation fans out by calling the internal payroll PDF endpoint, so print rendering logic stays centralized.
