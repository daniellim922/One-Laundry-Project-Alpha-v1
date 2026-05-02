import { and, eq, gte, lte } from "drizzle-orm";

import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { db } from "@/lib/db";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";
import { countPayrollPublicHolidays } from "@/services/payroll/public-holiday-payroll";

export type DraftPayrollExecutor = Pick<typeof db, "select" | "update">;

export type DraftPayrollRefreshRow = Pick<
    typeof payrollTable.$inferSelect,
    "id" | "workerId" | "payrollVoucherId" | "periodStart" | "periodEnd"
>;

export async function refreshDraftPayrollVoucher(
    executor: DraftPayrollExecutor,
    args: {
        payroll: DraftPayrollRefreshRow;
        employment: typeof employmentTable.$inferSelect;
        restDays: number;
        /** When provided, skips an extra timesheet round-trip (callers often already fetched these rows to derive `restDays`). */
        timesheetEntries?: Array<{
            hours: typeof timesheetTable.$inferSelect.hours;
            dateIn: typeof timesheetTable.$inferSelect.dateIn;
        }>;
    },
): Promise<void> {
    const { payroll, employment, restDays, timesheetEntries } = args;

    const entryRows =
        timesheetEntries ??
        (await executor
            .select({
                hours: timesheetTable.hours,
                dateIn: timesheetTable.dateIn,
            })
            .from(timesheetTable)
            .where(
                and(
                    eq(timesheetTable.workerId, payroll.workerId),
                    gte(timesheetTable.dateIn, payroll.periodStart),
                    lte(timesheetTable.dateOut, payroll.periodEnd),
                ),
            ));

    const totalHoursWorked = entryRows.reduce(
        (sum, entry) => sum + Number(entry.hours),
        0,
    );
    const publicHolidays = await countPayrollPublicHolidays(
        {
            periodStart: payroll.periodStart,
            periodEnd: payroll.periodEnd,
            workedDateIns: entryRows.map((entry) => entry.dateIn),
        },
        executor,
    );

    const advanceRows = await executor
        .select({
            amount: advanceTable.amount,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(
            and(
                eq(advanceRequestTable.workerId, payroll.workerId),
                gte(advanceTable.repaymentDate, payroll.periodStart),
                lte(advanceTable.repaymentDate, payroll.periodEnd),
            ),
        );
    const advanceTotal = advanceRows
        .filter((advance) => advance.status === "Installment Loan")
        .reduce((sum, advance) => sum + advance.amount, 0);

    const voucherValues = buildDraftPayrollVoucherValues({
        employment,
        totalHoursWorked,
        restDays,
        publicHolidays,
        advanceTotal,
    });

    await executor
        .update(payrollVoucherTable)
        .set({
            ...voucherValues,
            updatedAt: new Date(),
        })
        .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId));
}
