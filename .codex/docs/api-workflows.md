# One Laundry API Workflows

This document maps the live `app/api/` surface and its request flows after auth and IAM removal.

## API Inventory

| Route | Method | Access model | Purpose |
|---|---|---|---|
| `/api/advance/[id]/pdf` | `GET` | Open access | Generate printable advance summary PDF |
| `/api/payroll/[id]/revert-preview` | `GET` | Open access | Lazy-load the revert impact preview for the payroll detail dialog |
| `/api/payroll/[id]/revert` | `POST` | Open access | Reopen a Settled payroll and unwind timesheet + advance recovery |
| `/api/payroll/[id]/settle` | `POST` | Open access | Settle a single Draft payroll run |
| `/api/payroll/[id]/voucher-days` | `PATCH` | Open access | Update rest-day and public-holiday counts on a payroll voucher |
| `/api/payroll/[id]/pdf` | `GET` | Open access | Generate payroll summary or voucher PDF |
| `/api/payroll/download-selection` | `GET` | Open access | Lazy-load payroll rows for the download-selection dialog |
| `/api/payroll/download-zip` | `POST` | Open access | Bundle multiple payroll PDFs into a ZIP |
| `/api/payroll/settle` | `POST` | Open access | Bulk-settle multiple Draft payrolls from the settlement dialog |
| `/api/payroll/settlement-candidates` | `GET` | Open access | Lazy-load Draft payroll rows for the bulk-settlement dialog |
| `/api/timesheets/[id]` | `DELETE` | Open access | Delete a timesheet entry from row actions and re-sync draft payrolls |
| `/api/timesheets/import` | `POST` | Open access | Import AttendRecord-style timesheets and re-sync draft payrolls |
| `/api/workers/minimum-working-hours` | `PATCH` | Open access | Bulk-update minimum working hours for active full-time workers and re-sync draft payrolls |

## Access Contract

- The app is fully open access; API routes do not authenticate or authorize callers.
- No live API route returns a login redirect or auth-specific `401` / `403` branch.

## Advance PDF Export

```mermaid
flowchart TD
    A[Client GET /api/advance/:id/pdf] --> C[Load advance request + worker metadata]
    C --> D[Build internal summary URL with print=1]
    D --> E[Launch Playwright chromium]
    E --> F[Open summary page and wait for networkidle]
    F --> G[Wait for fonts and render PDF]
    G --> H[Return application/pdf attachment]
```

## Payroll PDF Export

```mermaid
flowchart TD
    A[Client GET /api/payroll/:id/pdf] --> C[Read mode query param]
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
    A[Client POST or PATCH payroll command] --> C[Validate body or params]
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
    A[Client POST /api/timesheets/import] --> C[Parse JSON body with AttendRecord schema]
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
    A[Client POST /api/payroll/download-zip] --> C[Parse and dedupe payrollIds]
    C --> D[Load payroll metadata for filenames and ZIP date range]
    D --> E[Fetch internal /api/payroll/:id/pdf responses]
    E --> F[Append PDF buffers to ZIP stream]
    F --> G[Attach _download-errors.txt when any PDF fails]
    G --> H[Return application/zip attachment]
```

## Runtime Notes

- All document/export routes declare `runtime = "nodejs"`.
- JSON command routes prefer the shared transport helpers in `app/api/_shared/` for open-access request handling, response shaping, and revalidation handling.
- Bulk worker minimum-hours updates stay action-free on the client side: the dashboard dialog calls the route, while worker create and edit forms remain server-action submissions.
- Payroll revert preview, bulk settlement candidate loading, payroll download selection, payroll settle/revert commands, voucher-day edits, and export flows now run through `app/api`; only payroll create and update remain server-action form submissions.
- Timesheet delete and AttendRecord import now call `app/api` from client components, while timesheet create and edit remain server-action submissions.
- PDF generation relies on Playwright-driven rendering of existing dashboard summary pages.
- ZIP creation fans out by calling the internal payroll PDF endpoint, so print rendering logic stays centralized.
