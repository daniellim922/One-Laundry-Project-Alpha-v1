import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import { countPayrollPublicHolidays } from "@/services/payroll/public-holiday-payroll";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PayrollSyncExecutor = Pick<typeof db, "select" | "update">;

export type PayrollSyncResult = { success: true } | { error: string };

async function synchronizeWorkerDraftPayrollsWithExecutor(
    executor: PayrollSyncExecutor,
    input: {
        workerId: string;
    },
): Promise<PayrollSyncResult> {
    const workerId = input.workerId?.trim();
    if (!workerId) {
        return { error: "Missing workerId" };
    }

    try {
        const drafts = await executor
            .select()
            .from(payrollTable)
            .where(
                and(
                    eq(payrollTable.workerId, workerId),
                    eq(payrollTable.status, "Draft"),
                ),
            );

        if (drafts.length === 0) {
            return { success: true };
        }

        const [employmentRow] = await executor
            .select({ employment: employmentTable })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(eq(workerTable.id, workerId))
            .limit(1);

        const employment = employmentRow?.employment ?? null;
        if (!employment) {
            return { success: true };
        }

        for (const payroll of drafts) {
            const entryRows = await executor
                .select({
                    hours: timesheetTable.hours,
                    dateIn: timesheetTable.dateIn,
                })
                .from(timesheetTable)
                .where(
                    and(
                        eq(timesheetTable.workerId, workerId),
                        gte(timesheetTable.dateIn, payroll.periodStart),
                        lte(timesheetTable.dateOut, payroll.periodEnd),
                    ),
                );
            const totalHoursWorked = entryRows.reduce(
                (sum, entry) => sum + Number(entry.hours),
                0,
            );

            const restDays = computeRestDaysForPayrollPeriod({
                periodStart: payroll.periodStart,
                periodEnd: payroll.periodEnd,
                presentDateInKeys: entryRows.map((e) => e.dateIn),
            });
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
                        eq(advanceRequestTable.workerId, workerId),
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

        return { success: true };
    } catch (error) {
        console.error("Error synchronizing worker Draft payrolls", error);
        return { error: "Failed to synchronize Draft payrolls" };
    }
}

export async function synchronizeWorkerDraftPayrolls(input: {
    workerId: string;
}): Promise<PayrollSyncResult> {
    return synchronizeWorkerDraftPayrollsWithExecutor(db, input);
}

export async function synchronizeWorkerDraftPayrollsInTx(
    tx: DbTransaction,
    input: {
        workerId: string;
    },
): Promise<PayrollSyncResult> {
    return synchronizeWorkerDraftPayrollsWithExecutor(
        tx as unknown as PayrollSyncExecutor,
        input,
    );
}
