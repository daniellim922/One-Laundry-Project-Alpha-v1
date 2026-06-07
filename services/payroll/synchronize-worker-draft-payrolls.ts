import { and, eq } from "drizzle-orm";

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
import { timesheetInPayrollWindowWhere } from "@/services/payroll/_shared/payroll-timesheet-window";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PayrollSyncResult =
    | { success: true; payrollIds: string[] }
    | { error: string };

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
            return { success: true, payrollIds: [] };
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
            return {
                success: true,
                payrollIds: drafts.map((payroll) => payroll.id),
            };
        }

        const payrollIds: string[] = [];

        for (const payroll of drafts) {
            payrollIds.push(payroll.id);
            const entryRows = await executor
                .select({
                    hours: timesheetTable.hours,
                    dateIn: timesheetTable.dateIn,
                })
                .from(timesheetTable)
                .where(
                    timesheetInPayrollWindowWhere({
                        workerId,
                        periodStart: payroll.periodStart,
                        periodEnd: payroll.periodEnd,
                    }),
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

        return { success: true, payrollIds };
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
