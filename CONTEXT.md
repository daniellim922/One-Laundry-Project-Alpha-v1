# Workforce Payroll and Back-Office Spend

This context supports internal operators running worker employment, attendance, payroll, salary advances, and business expenses for a laundry business. Customer-facing laundry orders, customer service delivery, inventory, and full accounting ledger workflows are outside this context.

## Language

### People and Employment

**Worker**:
A person on staff whose attendance, payroll, advances, and employment terms are managed in this context. A Worker has one current Employment.
_Avoid_: Staff member, Employee except in formal document copy

**Employee**:
Formal wording for a Worker in signed documents and legal-style copy. Employee is not a separate entity in this context.
_Avoid_: Using Employee as the domain entity name

**Employment**:
The current pay and work arrangement for a Worker: employment type, arrangement, shift pattern, pay rates, minimum working hours, CPF, and payment method. Employment is not a historical contract record.
_Avoid_: Contract, employment history

**Employment type**:
The Full Time or Part Time classification that determines how a Worker's payroll earnings are calculated.
_Avoid_: Arrangement, shift pattern, worker category

**Employment arrangement**:
The Foreign Worker or Local Worker classification used for operational and compliance grouping.
_Avoid_: Employment type, visa details, shift pattern

**Shift pattern**:
The Day Shift or Night Shift setting on Employment that tells the system how imported attendance cells become Timesheet entries. Shift pattern is not a roster, schedule, or employment type.
_Avoid_: Employment type, arrangement, roster

**Worker status**:
Whether a Worker is available for new operational work. Inactive Workers keep their history and may still have existing Draft payrolls finalized, but they are not eligible for new timesheets or new payroll creation.
_Avoid_: Archived, deleted, disabled

**Payment method**:
How Payroll Grand Total is disbursed to a Worker: PayNow, Bank Transfer, or Cash, with payout identifiers where needed.
_Avoid_: Payout channel when the configured worker payment method is meant

### Time and Attendance

**Timesheet entry**:
A single worked interval for one Worker. A Timesheet entry may be same-day or overnight, and its Hours are derived from clock-in and clock-out timestamps rather than manually authored.
_Avoid_: Attendance row, clock record

**Hours worked**:
The decimal worked duration derived from a Timesheet entry's clock-in and clock-out timestamps. Hours worked are not manually authored.
_Avoid_: Hours when minimum hours or overtime hours are meant

**Timesheet settlement status**:
Whether a Timesheet entry has been covered by a Settled Payroll. Use Timesheet Unpaid and Timesheet Paid to avoid confusing this status with Advance Paid, Installment Paid, or Expense Paid.
_Avoid_: Paid, unpaid

**AttendRecord import**:
The process of turning an external attendance file into Timesheet entries. AttendRecord is source evidence for attendance, not a native entity in this context.
_Avoid_: AttendRecord row as a domain object

**Unresolved worker match**:
An imported worker name that does not resolve to exactly one active Worker. The operator must map unresolved names before the import can create Timesheet entries.
_Avoid_: Missing employee, unknown staff

### Payroll

**Payroll**:
A pay run for one Worker over one Pay period, with a Payroll date and Draft or Settled status. Several Payrolls may be generated or settled together operationally, but the domain object remains one Worker's run.
_Avoid_: Monthly payroll batch, payslip

**Pay period**:
The inclusive date range of Timesheet entries considered for one Payroll.
_Avoid_: Cycle, month when the range is not exactly a calendar month

**Payroll date**:
The payment or processing date for a Payroll. Payroll date should be on or after the Pay period ends.
_Avoid_: Pay day when a precise payroll date is meant

**Payroll status**:
Draft means a Payroll's figures can still change. Settled means the Payroll has been finalized and its covered Timesheet entries and advance Installments have been applied.
_Avoid_: Approved, locked, posted

**Payroll voucher**:
The calculation snapshot for a Payroll: copied employment terms, hours, premiums, deductions, CPF, advance recovery, payout details, Payroll Subtotal, Payroll Grand Total, and Voucher number. A Payroll voucher is not a separate pay run.
_Avoid_: Payslip, voucher as a separate payroll

**Payroll download**:
A stored PDF or ZIP download for existing Payrolls. Payroll download is a delivery artifact and does not recalculate the Payroll.
_Avoid_: Export when a Payroll download is meant, payslip file as a separate payroll entity

**Voucher number**:
The human-facing sequential identifier on a Payroll voucher, formatted by year such as 2026-0001. It is for auditability and communication, not numeric calculation.
_Avoid_: Payroll ID, payslip ID

**Revert payroll**:
The action of moving a Settled Payroll back to Draft. Reverting a Payroll returns its covered Timesheet entries to Timesheet Unpaid and its affected Installments to Installment Loan.
_Avoid_: Reopen, undo payout

**Monthly pay**:
The fixed base amount for a Full Time Worker in a Pay period.
_Avoid_: Salary when a precise payroll component is meant

**Minimum working hours**:
The hours threshold for a Full Time Worker in a Pay period.
_Avoid_: Quota, target hours

**Minimum-hours bulk update**:
A batch operation that changes Minimum working hours for multiple active Full Time Workers and refreshes their affected Draft Payrolls.
_Avoid_: Mass edit when the payroll refresh implication matters

**Overtime hours**:
Full Time hours worked above Minimum working hours in a Pay period.
_Avoid_: OT in formal domain docs

**Overtime pay**:
Overtime hours multiplied by the Worker's Hourly rate.
_Avoid_: Overtime premium when the rule is plain hourly multiplication

**Rest days worked**:
Rest days in the Pay period on which the Worker worked.
_Avoid_: Rest days taken

**Rest-day premium**:
Premium pay for Rest days worked. It compensates work on a rest day, not resting.
_Avoid_: Weekend pay unless the rest day is explicitly a weekend

**Public holiday pay**:
Premium pay for configured public holidays worked in the Pay period.
_Avoid_: PH pay in domain docs

**Public holiday calendar**:
Shared payroll master data of named public-holiday dates used to calculate public holiday pay for Draft Payrolls. Updating the calendar changes affected Draft Payrolls, but not Settled Payrolls.
_Avoid_: Worker-specific holiday setting

**Hours-not-met deduction**:
A Payroll voucher deduction when a Full Time Worker's hours are below Minimum working hours.
_Avoid_: Penalty

**Part Time payroll**:
Hourly rate multiplied by Hours worked. Part Time Workers do not receive overtime pay, rest-day premium, public holiday pay, or hours-not-met deduction in this context.
_Avoid_: Applying Full Time payroll components to Part Time Workers

**CPF**:
The employee CPF amount deducted from Payroll Subtotal toward Payroll Grand Total. CPF is manually entered as a flat amount; employer CPF is outside the current context.
_Avoid_: Employer CPF, computed CPF percentage

**Payroll Subtotal**:
Payroll voucher earnings after hours-not-met deduction, before CPF and advance recovery.
_Avoid_: Gross pay

**Payroll Grand Total**:
The final Payroll voucher amount after CPF and advance recovery. Payroll Grand Total may be negative.
_Avoid_: Take-home pay when negative amounts are possible

**Guided monthly payroll workflow**:
The dashboard checklist for the current business month that orients operators through the usual payroll sequence. It is guidance and navigation, not proof that a specific Pay period is complete.
_Avoid_: Audit checklist, payroll completion ledger

### Salary Advances

**Advance request**:
A Worker's signed request for salary money before normal payroll recovery, including requested amount, purpose, signatures, and request status.
_Avoid_: Loan application unless policy uses loan language explicitly

**Installment**:
An individual repayment line for an Advance request. Installments are recovered through Payroll when their repayment date falls in the Pay period.
_Avoid_: Advance when the repayment line is meant

**Advance request status**:
Advance Loan means at least one Installment is still outstanding. Advance Paid means all linked Installments are Installment Paid.
_Avoid_: Settled, paid without the Advance prefix

**Installment status**:
Installment Loan means this repayment line is still outstanding. Installment Paid means this repayment line has been recovered through Payroll.
_Avoid_: Paid without the Installment prefix

**Paid Installment**:
An Installment in Installment Paid status. A Paid Installment is immutable from the Advance request form and can only return to Installment Loan when the Payroll that recovered it is reverted.
_Avoid_: Editing a recovered installment directly

### Operating Expenses

**Operating Expense**:
A recorded business spend line for laundry operations. Operating Expenses are independent of Workers, Payroll, and salary advances; they are not reimbursements through Payroll.
_Avoid_: Expense when the distinction from payroll or advances matters, reimbursement

**Operating Expense category**:
A top-level user-maintained grouping for Operating Expenses.
_Avoid_: Ledger code unless accounting formally adopts ledger codes

**Operating Expense subcategory**:
A user-maintained label under one Operating Expense category.
_Avoid_: Free-text tag

**Operating Expense supplier**:
Vendor master data for Operating Expenses, with a supplier name and optional supplier GST registration number.
_Avoid_: Worker, creditor unless accounting requires that term

**Operating Expense master data**:
The shared set of Operating Expense categories, subcategories, and suppliers used when recording Operating Expenses.
_Avoid_: Expense settings

**Operating Expense snapshot**:
The category, subcategory, and supplier names saved on an Operating Expense as they were recorded. Later master-data changes do not rewrite historical Operating Expenses.
_Avoid_: Live category reference when history is meant

**Operating Expense status**:
The status of an Operating Expense, using the labels Expense Submitted and Expense Paid in UI and data. Expense Submitted is editable and deletable; Expense Paid is not editable or deletable until reverted to Expense Submitted.
_Avoid_: Treating Expense Submitted or Expense Paid as statuses for payroll, advances, or generic expenses

**Operating Expense Subtotal**:
The pre-GST amount for an Operating Expense.
_Avoid_: Payroll Subtotal

**Operating Expense GST**:
The Goods and Services Tax amount for an Operating Expense.
_Avoid_: CPF, tax on payroll

**Operating Expense Grand Total**:
Operating Expense Subtotal plus Operating Expense GST.
_Avoid_: Payroll Grand Total

**Operating Expense export**:
A downloadable .xlsx register of Operating Expenses. Amounts render as SGD decimal values for spreadsheet use, even when persisted money values are stored as cents.
_Avoid_: Payroll download, accounting ledger posting

### Access

**Authenticated operator**:
A signed-in internal user who performs workforce payroll and back-office spend work in this app. Operators share one capability model unless separate roles are introduced later.
_Avoid_: Customer, tenant, public user
