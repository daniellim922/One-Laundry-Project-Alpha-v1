# Ubiquitous Language

Domain vocabulary inferred from the implemented schema, payroll calculations, and dashboard. **Agreed product scope:** this application covers **internal operations only** (workforce payroll, advances, expenses, IAM) for a laundry business; **customer-facing laundry** (orders, customers, service delivery) lives in another system or is out of scope here. The **bounded context in code** is **workforce payroll and back-office spend**.

## People and employment


| Term                       | Definition                                                                                                             | Aliases to avoid                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Worker**                 | A person on staff with profile and NRIC (or equivalent id), linked to exactly one **Employment** record.               | Staff member (prefer **Worker** in HR/payroll UI)  |
| **Employee** (surface)     | The same person as **Worker**, used on **formal** copy (e.g. advance signatures). Not a separate entity in the model.  | Using **Employee** on casual payroll screens       |
| **Employment**             | The contractual pay rules for a **Worker**: type, arrangement, rates, minimum hours, CPF, and how salary is paid out.  | Contract (unless legal sense is explicit), profile |
| **Employment type**        | Either **Full Time** or **Part Time**, determining how **Gross pay** is built from base, overtime, and premiums.       | Schedule, shift type                               |
| **Employment arrangement** | Either **Foreign Worker** or **Local Worker** (classification for compliance or reporting, stored on **Employment**).  | Visa status (unless that is the legal meaning)     |
| **Minimum working hours**  | The contracted hours threshold for a full-time **Worker**; hours above it count as **Overtime hours**.                 | Target hours, quota                                |
| **Payment method**         | How net pay is disbursed: **PayNow**, **Bank Transfer**, or **Cash**, with stored payout identifiers where applicable. | Payout channel                                     |


## Time and attendance


| Term                            | Definition                                                                                                                                                                                                                                                                   | Aliases to avoid                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Timesheet entry**             | A single worked interval: **Date in**, **Time in**, **Date out**, **Time out**, derived **Hours**, and a settlement flag (**Unpaid** / **Paid**).                                                                                                                            | Clock record, attendance row                              |
| **Hours**                       | Decimal duration worked for one **Timesheet entry**, computed from in/out date-times (including overnight spans).                                                                                                                                                            | Duration (when money is implied, prefer **Hours worked**) |
| **Timesheet settlement status** | Stored as **Unpaid** / **Paid**: **Paid** applies only after the containing **Payroll** is **Settled** (editing restricted for **Paid** rows). In the UI, prefer labels like **Included in payroll** instead of bare **Paid** to avoid confusion with **Advance** repayment. | Bare **Paid** in user-facing timesheet copy               |


## Payroll run and voucher


| Term                                 | Definition                                                                                                                                                                                                                                                                                                                                                                         | Aliases to avoid                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Payroll**                          | A pay run for one **Worker** over a **Pay period** (**Period start**–**Period end**) with a **Payroll date**, in **Draft** or **Settled** status.                                                                                                                                                                                                                                  | Pay slip, payslip (those are outputs)                                                                       |
| **Pay period**                       | The inclusive calendar range of **Timesheet entries** that roll into a **Payroll** calculation. For one **Worker**, **Pay periods** of different **Payrolls** must **not overlap** (no double-counting).                                                                                                                                                                           | Cycle (unless everyone agrees)                                                                              |
| **Payroll date**                     | The nominal payment or processing date associated with the **Payroll** run.                                                                                                                                                                                                                                                                                                        | Pay day (if colloquial)                                                                                     |
| **Payroll status**                   | **Draft** = figures can be recalculated; **Settled** = the run is finalized for that period.                                                                                                                                                                                                                                                                                       | Approved, locked (use **Settled** in domain speech)                                                         |
| **Payroll voucher**                  | The frozen calculation snapshot for a **Payroll**: hours, premiums, deductions, CPF, **Advance** recovery, **Total pay**, **Net pay**, and copied payout details. **Rest days** and **Public holidays** counts on the voucher are **entered or adjusted by the payroll operator** for that run (not derived from a system calendar in the agreed design).                          | Voucher (without "payroll"), payslip                                                                        |
| **Gross pay components** (full-time) | **Monthly pay** as base, plus **Overtime pay**, **Rest day pay**, **Public holiday pay**, plus any **Hours-not-met deduction**.                                                                                                                                                                                                                                                    | Salary (too vague)                                                                                          |
| **Gross pay components** (part-time) | **Hourly rate** × **Total hours worked**, plus **Public holiday pay** (no overtime/rest lines in the pure hourly path).                                                                                                                                                                                                                                                            | Wages (ok colloquially; prefer precise terms in rules)                                                      |
| **Overtime hours**                   | For full-time, hours worked beyond **Minimum working hours** in the period.                                                                                                                                                                                                                                                                                                        | OT                                                                                                          |
| **Rest day pay**                     | Premium pay for **Rest days** in the period at **Rest day rate**.                                                                                                                                                                                                                                                                                                                  | Weekend pay (only if rest days are literally weekends)                                                      |
| **Public holiday pay**               | Premium for **Public holidays** in the period, computed using **Rest day rate** in the current rules.                                                                                                                                                                                                                                                                              | PH pay                                                                                                      |
| **Hours not met**                    | Shortfall vs **Minimum working hours** (negative when below contract); drives **Hours-not-met deduction** when applicable.                                                                                                                                                                                                                                                         | Undertime                                                                                                   |
| **Hours-not-met deduction**          | A negative adjustment to **Total pay** when contracted hours are not met (zero when there is no shortfall).                                                                                                                                                                                                                                                                        | Penalty                                                                                                     |
| **CPF**                              | **Employee CPF only** — amount deducted from **Total pay** toward **Net pay** (stored on **Employment** / copied to **Payroll voucher**); employer CPF is out of scope unless added later.                                                                                                                                                                                         | Provident fund (region-specific); mixing in employer CPF in this field                                      |
| **Total pay**                        | Gross pay for the period after **Hours-not-met deduction**, before CPF and **Advance** recovery.                                                                                                                                                                                                                                                                                   | Gross (ambiguous)                                                                                           |
| **Net pay**                          | **Total pay** minus **CPF** and the sum of outstanding **Installment** amounts in **Installment Loan** status for the period.                                                                                                                                                                                                                                                                      | Take-home (informal)                                                                                        |
| **Synchronize worker drafts**        | Recompute all **Draft** **Payrolls** for a **Worker** from current **Employment**, **Timesheet entries**, **Payroll voucher** inputs, and **Advances**.                                                                                                                                                                                                                            | Sync, refresh                                                                                               |
| **Reopen** (payroll)                 | Privileged action: **Settled** → **Draft** for the **whole** **Payroll** run (one worker, one run). Affected **Timesheet** entries return to **Unpaid**. **Advance** recovery applied in that **Settled** run is **reverted** so installments return to **Installment Loan** until the run is **Settled** again. Same **Roles** that may **Settle** may **Reopen** (symmetric payroll-admin trust). | Partial reopen of one run; using **Reopen** when payout is already final in the real world without a policy |


## Salary advances


| Term                                | Definition                                                                                                                                | Aliases to avoid                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Advance request**                 | A **Worker**-initiated request for a salary **Advance**, with amount, purpose, and signature fields (formal labels may say **employee**). | Loan application (unless legal)               |
| **Advance**                         | A disbursement line linked to an **Advance request**, with amount and repayment scheduling.                                               | Loan (unless policy uses that term legally)   |
| **Advance request status (Advance Loan)** | The request-level status: money is still to be recovered through payroll (at least one installment outstanding).                  | Loan, Pending, open                                 |
| **Advance request status (Advance Paid)** | The request-level status: all linked **Installments** are **Installment Paid**, so the advance is fully repaid.                  | Paid, Settled (reserve **Settled** for **Payroll**) |
| **Installment status (Installment Loan)** | The installment-level status: this individual repayment line is still outstanding.                                                | Loan                                                |
| **Installment status (Installment Paid)** | The installment-level status: this individual repayment line has been recovered (typically during payroll settlement).            | Paid                                                |


## Expenses


| Term        | Definition                                                                                                                                                                                          | Aliases to avoid                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Expense** | A business **Expense** line: description, amount, optional category, and date. **Expenses** do not allocate to a **Worker** or a **Payroll** run (shop/overhead or general back-office spend only). | Cost (unless finance agrees); implying reimbursement through **Net pay** without a dedicated model |


## Access control (supporting bounded context)


| Term        | Definition                                                                                                | Aliases to avoid                                             |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **User**    | A login identity in the app; permissions come from **Roles** on **Features**.                             | Worker (a **User** may manage **Workers** without being one) |
| **Feature** | A named area of the product (e.g. **Workers**, **Payroll**) that **Roles** may create/read/update/delete. | Module (implementation slang)                                |
| **Role**    | A named bundle of permissions over **Features**.                                                          | Group                                                        |


## Relationships

- A **Worker** has exactly one **Employment**.
- A **Timesheet entry** belongs to exactly one **Worker**.
- A **Payroll** belongs to exactly one **Worker** and references exactly one **Payroll voucher**.
- **Draft** **Payrolls** for a **Worker** are recomputed from **Timesheet entries** whose dates fall in the **Pay period**, from the **Employment** terms, **Payroll voucher** counts (e.g. **Rest days**, **Public holidays**), and **Installments** in **Installment Loan** status.
- An **Advance request** belongs to one **Worker**; one or more **Installments** belong to one **Advance request**.
- **Advance request** status becomes **Advance Paid** when every linked **Installment** is **Installment Paid**.
- **Settle** marks the run **Settled** and sets covered **Timesheet** entries to **Paid**; **Reopen** reverses that for the run and reverts **Advance** recovery as above.

## Example dialogue

> **Dev:** "When we **settle** a **Payroll**, should **Timesheet entries** in that period flip to **Paid**?"

> **Domain expert:** "Only on **Settle** — not when the run is still **Draft**. On screen we say **Included in payroll**, not **Paid**, so nobody confuses it with an **Installment** marked **Installment Paid** (repaid)."

> **Dev:** "We **reopen** a **Settled** run to fix a mistake — what happens to **Advances**?"

> **Domain expert:** "Recovery unwinds: installments go back to **Installment Loan** until we **Settle** again. We only **reopen** the **whole** payroll for that worker and period, and periods must not overlap across runs."

> **Dev:** "Who can **Reopen**?"

> **Domain expert:** "Whoever can **Settle**. **Workers** are still not the same as **Users** — managers sign in as **Users**; **Workers** are who we pay."

## Flagged ambiguities

- **Settled** applies to **Payroll**; using **Settled** for **Advances** would collide with **Advance Paid** / **Installment Paid** — keep **Settled** for payroll finalization only.
- **Reopen** assumes the system is the source of truth for **Advance** balances; if real-world payouts already happened, operations may need a policy outside this model.

## Deferred (not in vocabulary until implemented)

- A future payroll status **Needs Attention** was discussed; **no** shared rules or terms for it until it exists in code.
