# One Laundry API Workflows

This document maps the live `app/api/` surface and its request flows.

## API Inventory

| Route | Method | Auth / permission | Purpose |
|---|---|---|---|
| `/api/auth/[...all]` | `GET`, `POST` | better-auth handler | Session, account, and auth lifecycle |
| `/api/advance/[id]/pdf` | `GET` | Session + `Advance:read` | Generate printable advance summary PDF |
| `/api/iam/users/[id]/status` | `PATCH` | Session + `IAM (Identity and Access Management):update` | Ban or unban a user from a client-triggered HTTP workflow |
| `/api/payroll/[id]/pdf` | `GET` | Session + `Payroll:read` | Generate payroll summary or voucher PDF |
| `/api/payroll/download-zip` | `POST` | Session + `Payroll:read` | Bundle multiple payroll PDFs into a ZIP |

## Auth Handler

```mermaid
flowchart TD
    A[Client calls /api/auth/[...all]] --> B[toNextJsHandler auth]
    B --> C[better-auth session or account flow]
    C --> D[HTTP response from better-auth]
```

## Advance PDF Export

```mermaid
flowchart TD
    A[Client GET /api/advance/:id/pdf] --> B[auth.api.getSession]
    B -->|no session| C[401 Unauthorized]
    B --> D[checkPermission Advance read]
    D -->|forbidden| E[403 Unauthorized]
    D --> F[Load advance request + worker metadata]
    F --> G[Build internal summary URL with print=1]
    G --> H[Launch Playwright chromium]
    H --> I[Forward session cookie]
    I --> J[Open summary page and wait for networkidle]
    J --> K[Wait for fonts and render PDF]
    K --> L[Return application/pdf attachment]
```

## IAM User Status Command

```mermaid
flowchart TD
    A[Client PATCH /api/iam/users/:id/status] --> B[requireApiPermission helper]
    B -->|no session| C[401 JSON error]
    B -->|forbidden| D[403 JSON error]
    B --> E[Parse JSON body]
    E -->|invalid body| F[400 JSON validation error]
    E --> G[services/iam/update-user-ban-status]
    G -->|user missing| H[404 JSON error]
    G --> I[Update user banned fields and revoke sessions on ban]
    I --> J[revalidate /dashboard/iam + /dashboard/iam/roles]
    J --> K[200 JSON success]
```

## Payroll PDF Export

```mermaid
flowchart TD
    A[Client GET /api/payroll/:id/pdf] --> B[auth.api.getSession]
    B -->|no session| C[401 Unauthorized]
    B --> D[checkPermission Payroll read]
    D -->|forbidden| E[403 Unauthorized]
    D --> F[Read mode query param]
    F --> G[Load payroll + worker metadata]
    G --> H[Build internal summary or voucher print URL]
    H --> I[Launch Playwright chromium]
    I --> J[Forward session cookie]
    J --> K[Open print page and wait for fonts]
    K --> L[Render PDF]
    L --> M[Return application/pdf attachment]
```

## Bulk Payroll ZIP Download

```mermaid
flowchart TD
    A[Client POST /api/payroll/download-zip with payrollIds] --> B[auth.api.getSession]
    B -->|no session| C[401 Unauthorized]
    B --> D[checkPermission Payroll read]
    D -->|forbidden| E[403 Unauthorized]
    D --> F[Parse JSON body]
    F -->|invalid or empty| G[400 error]
    F --> H[Dedupe payrollIds]
    H --> I[Load payroll metadata for filenames and ZIP range]
    I --> J[Loop payrollIds]
    J --> K[Fetch internal /api/payroll/:id/pdf with session cookie]
    K -->|failure| L[Record failure for report]
    K -->|success| M[Collect PDF buffer and unique filename]
    M --> J
    L --> J
    J --> N[Stream ZIP with archiver]
    N --> O[Append PDFs]
    O --> P[Append _download-errors.txt when partial]
    P --> Q[Return ZIP attachment]
```

## Runtime Notes

- All document/export routes declare `runtime = "nodejs"`.
- JSON command routes should prefer the shared transport helpers in `app/api/_shared/` for auth, permission, response, and revalidation handling.
- PDF generation relies on Playwright-driven rendering of existing dashboard summary pages.
- ZIP creation fans out by calling the internal payroll PDF endpoint, so permission and print rendering logic stay centralized.
