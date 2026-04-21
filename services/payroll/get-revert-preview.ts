import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";

export type RevertPreviewTimesheetLine = {
    id: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
    hours: number;
};

export type RevertPreviewAdvanceInstallmentLine = {
    id: string;
    advanceRequestId: string;
    amount: number;
    repaymentDate: string | null;
};

export type RevertPreviewRow = {
    name: string;
    currentStatus: string;
    futureStatus: string;
    timesheetLines?: RevertPreviewTimesheetLine[];
    advanceInstallmentLines?: RevertPreviewAdvanceInstallmentLine[];
};

export type GetPayrollRevertPreviewResult =
    | { data: RevertPreviewRow[] }
    | {
          error: string;
          code: "NOT_FOUND" | "INVALID_STATE";
      };

export async function getPayrollRevertPreview(
    payrollId: string,
): Promise<GetPayrollRevertPreviewResult> {
    const [payroll] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payroll) {
        return { error: "Payroll not found", code: "NOT_FOUND" };
    }

    if (payroll.status !== "Settled") {
        return {
            error: "Only Settled payrolls can be previewed for revert",
            code: "INVALID_STATE",
        };
    }

    const rows: RevertPreviewRow[] = [
        { name: "Payroll", currentStatus: "Settled", futureStatus: "Draft" },
    ];

    const timesheets = await db
        .select({
            id: timesheetTable.id,
            dateIn: timesheetTable.dateIn,
            dateOut: timesheetTable.dateOut,
            timeIn: timesheetTable.timeIn,
            timeOut: timesheetTable.timeOut,
            hours: timesheetTable.hours,
        })
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
                eq(timesheetTable.status, "Timesheet Paid"),
            ),
        )
        .orderBy(asc(timesheetTable.dateIn));

    if (timesheets.length > 0) {
        rows.push({
            name: `Timesheets (${timesheets.length})`,
            currentStatus: "Timesheet Paid",
            futureStatus: "Timesheet Unpaid",
            timesheetLines: timesheets.map((timesheet) => ({
                id: timesheet.id,
                dateIn: String(timesheet.dateIn),
                dateOut: String(timesheet.dateOut),
                timeIn: String(timesheet.timeIn),
                timeOut: String(timesheet.timeOut),
                hours: timesheet.hours,
            })),
        });
    }

    const advancesInPeriod = await db
        .select({
            id: advanceTable.id,
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
            amount: advanceTable.amount,
            repaymentDate: advanceTable.repaymentDate,
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

    const installmentPaidInPeriod = advancesInPeriod
        .filter((advance) => advance.status === "Installment Paid")
        .sort((left, right) =>
            String(left.repaymentDate ?? "").localeCompare(
                String(right.repaymentDate ?? ""),
            ),
        );

    if (installmentPaidInPeriod.length > 0) {
        rows.push({
            name: `Advance (${installmentPaidInPeriod.length})`,
            currentStatus: "Installment Paid",
            futureStatus: "Installment Loan",
            advanceInstallmentLines: installmentPaidInPeriod.map((advance) => ({
                id: advance.id,
                advanceRequestId: advance.advanceRequestId,
                amount: advance.amount,
                repaymentDate: advance.repaymentDate,
            })),
        });
    }

    const requestIds = Array.from(
        new Set(advancesInPeriod.map((advance) => advance.advanceRequestId)),
    );

    if (requestIds.length > 0) {
        const requestAdvances = await db
            .select({
                advanceRequestId: advanceTable.advanceRequestId,
                status: advanceTable.status,
            })
            .from(advanceTable)
            .where(inArray(advanceTable.advanceRequestId, requestIds));

        const byRequestId = requestAdvances.reduce(
            (accumulator, row) => {
                if (!accumulator[row.advanceRequestId]) {
                    accumulator[row.advanceRequestId] = [];
                }
                accumulator[row.advanceRequestId]!.push({ status: row.status });
                return accumulator;
            },
            {} as Record<
                string,
                Array<{ status: "Installment Loan" | "Installment Paid" }>
            >,
        );

        const installmentPaidRequestIds = new Set(
            installmentPaidInPeriod.map((advance) => advance.advanceRequestId),
        );

        let advanceRequestFlipCount = 0;
        for (const requestId of requestIds) {
            const allInstallments = byRequestId[requestId] ?? [];
            const currentlyAllPaid =
                allInstallments.length > 0 &&
                allInstallments.every(
                    (installment) => installment.status === "Installment Paid",
                );

            if (currentlyAllPaid && installmentPaidRequestIds.has(requestId)) {
                advanceRequestFlipCount++;
            }
        }

        if (advanceRequestFlipCount > 0) {
            rows.push({
                name: `Advance Requests (${advanceRequestFlipCount})`,
                currentStatus: "Advance Paid",
                futureStatus: "Advance Loan",
            });
        }
    }

    return { data: rows };
}
