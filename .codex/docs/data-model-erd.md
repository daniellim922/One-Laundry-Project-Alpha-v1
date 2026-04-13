# One Laundry Data Model ERD

This ERD documents the live Drizzle/Postgres model across payroll operations, IAM, auth, and expenses.

## Mermaid ERD

```mermaid
erDiagram
    EMPLOYMENT {
        uuid id PK
        text employment_type
        text employment_arrangement
        real monthly_pay
        real minimum_working_hours
        real hourly_rate
        real rest_day_rate
        text payment_method
    }

    WORKER {
        uuid id PK
        text name
        text nric
        text email
        text phone
        text status
        uuid employment_id FK
    }

    TIMESHEET {
        uuid id PK
        date date_in
        time time_in
        date date_out
        time time_out
        real hours
        text status
        uuid worker_id FK
    }

    ADVANCE_REQUEST {
        uuid id PK
        uuid worker_id FK
        text status
        date request_date
        integer amount_requested
    }

    ADVANCE {
        uuid id PK
        integer amount
        text status
        date repayment_date
        uuid advance_request_id FK
    }

    PAYROLL_VOUCHER {
        uuid id PK
        real voucher_number
        text employment_type
        text employment_arrangement
        real total_hours_worked
        real overtime_hours
        real total_pay
        real net_pay
        real advance
    }

    PAYROLL {
        uuid id PK
        uuid worker_id FK
        uuid payroll_voucher_id FK
        date period_start
        date period_end
        date payroll_date
        text status
    }

    EXPENSE {
        uuid id PK
        text description
        integer amount
        text category
        timestamp date
    }

    USER {
        text id PK
        text email
        text username
        boolean banned
    }

    SESSION {
        text id PK
        text user_id FK
        timestamp expires_at
        text token
    }

    ACCOUNT {
        text id PK
        text user_id FK
        text provider_id
        text account_id
    }

    VERIFICATION {
        text id PK
        text identifier
        text value
        timestamp expires_at
    }

    FEATURE {
        uuid id PK
        text name
    }

    ROLE {
        uuid id PK
        text name
    }

    ROLE_PERMISSION {
        uuid id PK
        uuid role_id FK
        uuid feature_id FK
        boolean create
        boolean read
        boolean update
        boolean delete
    }

    USER_ROLE {
        uuid id PK
        text user_id FK
        uuid role_id FK
    }

    EMPLOYMENT ||--|| WORKER : "assigned to"
    WORKER ||--o{ TIMESHEET : "logs"
    WORKER ||--o{ ADVANCE_REQUEST : "submits"
    ADVANCE_REQUEST ||--o{ ADVANCE : "repays as"
    WORKER ||--o{ PAYROLL : "paid through"
    PAYROLL_VOUCHER ||--o{ PAYROLL : "backs"
    USER ||--o{ SESSION : "owns"
    USER ||--o{ ACCOUNT : "links"
    USER ||--o{ USER_ROLE : "receives"
    ROLE ||--o{ USER_ROLE : "assigned via"
    ROLE ||--o{ ROLE_PERMISSION : "grants"
    FEATURE ||--o{ ROLE_PERMISSION : "scopes"
```

## Notes

- `expenses` is currently standalone and does not link to `worker` or `payroll`.
- `verification` is standalone support data for auth flows.
- App logic treats `payroll` and `payroll_voucher` as one voucher per payroll run, but the current schema stores the foreign key on `payroll` without a unique constraint on `payroll_voucher_id`.

## Status Enums

- `worker_status`: `Active`, `Inactive`
- `timesheet_payment_status`: `Timesheet Unpaid`, `Timesheet Paid`
- `advance_loan_status`: `Advance Loan`, `Advance Paid`
- `installment_status`: `Installment Loan`, `Installment Paid`
- `payroll_status`: `Draft`, `Settled`
