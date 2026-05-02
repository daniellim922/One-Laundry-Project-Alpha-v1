import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import {
    refreshDraftPayrollVoucher,
    type DraftPayrollExecutor,
} from "@/services/payroll/_shared/refresh-draft-payroll-voucher";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PayrollSyncResult = { success: true } | { error: string };

async function synchronizeWorkerDraftPayrollsWithExecutor(
    executor: DraftPayrollExecutor,
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

            const restDays = computeRestDaysForPayrollPeriod({
                periodStart: payroll.periodStart,
                periodEnd: payroll.periodEnd,
                presentDateInKeys: entryRows.map((e) => e.dateIn),
            });

            await refreshDraftPayrollVoucher(executor, {
                payroll,
                employment,
                restDays,
                timesheetEntries: entryRows,
            });
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
        tx as unknown as DraftPayrollExecutor,
        input,
    );
}
