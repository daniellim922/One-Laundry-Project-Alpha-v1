import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    countMissingTimesheetDateIns,
    countSundaysInPeriod,
    restDaysFromMissingDateCount,
} from "@/utils/payroll/missing-timesheet-dates";
import {
    refreshDraftPayrollVoucher,
    type DraftPayrollExecutor,
} from "@/services/payroll/_shared/refresh-draft-payroll-voucher";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DraftPayrollRefreshResult =
    | { success: true; affectedPayrollIds: string[] }
    | { error: string };

function yearRange(year: number) {
    return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
    };
}

async function refreshAffectedDraftPayrollsForPublicHolidayYearWithExecutor(
    executor: DraftPayrollExecutor,
    input: {
        year: number;
    },
): Promise<DraftPayrollRefreshResult> {
    const { start, end } = yearRange(input.year);

    try {
        const drafts = await executor
            .select({
                id: payrollTable.id,
                workerId: payrollTable.workerId,
                payrollVoucherId: payrollTable.payrollVoucherId,
                periodStart: payrollTable.periodStart,
                periodEnd: payrollTable.periodEnd,
            })
            .from(payrollTable)
            .where(
                and(
                    eq(payrollTable.status, "Draft"),
                    lte(payrollTable.periodStart, end),
                    gte(payrollTable.periodEnd, start),
                ),
            );

        if (drafts.length === 0) {
            return { success: true, affectedPayrollIds: [] };
        }

        const employmentByWorkerId = new Map<
            string,
            typeof employmentTable.$inferSelect
        >();

        for (const payroll of drafts) {
            let employment = employmentByWorkerId.get(payroll.workerId);
            if (!employment) {
                const [employmentRow] = await executor
                    .select({ employment: employmentTable })
                    .from(workerTable)
                    .innerJoin(
                        employmentTable,
                        eq(workerTable.employmentId, employmentTable.id),
                    )
                    .where(eq(workerTable.id, payroll.workerId))
                    .limit(1);

                employment = employmentRow?.employment;
                if (!employment) {
                    continue;
                }
                employmentByWorkerId.set(payroll.workerId, employment);
            }

            const entryRows = await executor
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
                );

            const missingCount = countMissingTimesheetDateIns({
                periodStart: payroll.periodStart,
                periodEnd: payroll.periodEnd,
                presentDateInKeys: entryRows.map((entry) => entry.dateIn),
            });
            const sundayBudget = countSundaysInPeriod({
                periodStart: payroll.periodStart,
                periodEnd: payroll.periodEnd,
            });
            const restDays = restDaysFromMissingDateCount(
                missingCount,
                sundayBudget,
            );

            await refreshDraftPayrollVoucher(executor, {
                payroll,
                employment,
                restDays,
                timesheetEntries: entryRows,
            });
        }

        return {
            success: true,
            affectedPayrollIds: drafts.map((p) => p.id),
        };
    } catch (error) {
        console.error(
            "Error refreshing affected Draft payrolls for public holiday year",
            error,
        );
        return { error: "Failed to refresh affected Draft payrolls" };
    }
}

export async function refreshAffectedDraftPayrollsForPublicHolidayYear(input: {
    year: number;
}): Promise<DraftPayrollRefreshResult> {
    return refreshAffectedDraftPayrollsForPublicHolidayYearWithExecutor(
        db,
        input,
    );
}

export async function refreshAffectedDraftPayrollsForPublicHolidayYearInTx(
    tx: DbTransaction,
    input: {
        year: number;
    },
): Promise<DraftPayrollRefreshResult> {
    return refreshAffectedDraftPayrollsForPublicHolidayYearWithExecutor(
        tx as unknown as DraftPayrollExecutor,
        input,
    );
}
