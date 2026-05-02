import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { advanceRepaymentInPayrollWindowWhere } from "@/services/payroll/_shared/advance-repayment-window";

export type PayrollCommandTransaction = Parameters<
    Parameters<typeof db.transaction>[0]
>[0];

type AdvanceInPeriodRow = {
    id: string;
    advanceRequestId: string;
    status: "Installment Loan" | "Installment Paid";
};

type RequestAdvanceRow = {
    advanceRequestId: string;
    status: "Installment Loan" | "Installment Paid";
};

export type PayrollTarget = {
    id: string;
    workerId: string;
    periodStart: string;
    periodEnd: string;
};

async function updateAdvanceRequestStatuses(
    tx: PayrollCommandTransaction,
    requestIds: string[],
    now: Date,
) {
    if (requestIds.length === 0) return;

    const requestAdvances: RequestAdvanceRow[] = await tx
        .select({
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .where(inArray(advanceTable.advanceRequestId, requestIds));

    const byRequestId = requestAdvances.reduce(
        (acc, row) => {
            if (!acc[row.advanceRequestId]) acc[row.advanceRequestId] = [];
            acc[row.advanceRequestId]!.push({ status: row.status });
            return acc;
        },
        {} as Record<
            string,
            Array<{ status: "Installment Loan" | "Installment Paid" }>
        >,
    );

    const fullyPaidRequestIds = requestIds.filter((requestId) => {
        const advances = byRequestId[requestId] ?? [];
        return (
            advances.length > 0 &&
            advances.every((advance) => advance.status === "Installment Paid")
        );
    });

    const notFullyPaidRequestIds = requestIds.filter(
        (requestId) => !fullyPaidRequestIds.includes(requestId),
    );

    if (fullyPaidRequestIds.length > 0) {
        await tx
            .update(advanceRequestTable)
            .set({
                status: "Advance Paid",
                updatedAt: now,
            })
            .where(inArray(advanceRequestTable.id, fullyPaidRequestIds));
    }

    if (notFullyPaidRequestIds.length > 0) {
        await tx
            .update(advanceRequestTable)
            .set({
                status: "Advance Loan",
                updatedAt: now,
            })
            .where(inArray(advanceRequestTable.id, notFullyPaidRequestIds));
    }
}

async function syncAdvanceRequestStatusesFromAdvances(
    tx: PayrollCommandTransaction,
    advances: Array<{ advanceRequestId: string }>,
    now: Date,
) {
    const requestIds = Array.from(
        new Set(advances.map((advance) => advance.advanceRequestId)),
    );
    await updateAdvanceRequestStatuses(tx, requestIds, now);
}

async function updateTimesheetsInPayrollPeriod(
    tx: PayrollCommandTransaction,
    payroll: PayrollTarget,
    args: {
        fromStatus: "Timesheet Paid" | "Timesheet Unpaid";
        toStatus: "Timesheet Paid" | "Timesheet Unpaid";
        now: Date;
    },
) {
    await tx
        .update(timesheetTable)
        .set({
            status: args.toStatus,
            updatedAt: args.now,
        })
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
                eq(timesheetTable.status, args.fromStatus),
            ),
        );
}

export async function settlePayrollInTx(
    tx: PayrollCommandTransaction,
    payroll: PayrollTarget,
    now: Date,
) {
    await tx
        .update(payrollTable)
        .set({
            status: "Settled",
            updatedAt: now,
        })
        .where(eq(payrollTable.id, payroll.id));

    const advancesInPeriod: AdvanceInPeriodRow[] = await tx
        .select({
            id: advanceTable.id,
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(advanceRepaymentInPayrollWindowWhere(payroll));

    const installmentLoanIds = advancesInPeriod
        .filter((advance) => advance.status === "Installment Loan")
        .map((advance) => advance.id);

    if (installmentLoanIds.length > 0) {
        await tx
            .update(advanceTable)
            .set({
                status: "Installment Paid",
                updatedAt: now,
            })
            .where(inArray(advanceTable.id, installmentLoanIds));
    }

    await syncAdvanceRequestStatusesFromAdvances(tx, advancesInPeriod, now);

    await updateTimesheetsInPayrollPeriod(tx, payroll, {
        fromStatus: "Timesheet Unpaid",
        toStatus: "Timesheet Paid",
        now,
    });
}

export async function revertPayrollInTx(
    tx: PayrollCommandTransaction,
    payroll: PayrollTarget,
    now: Date,
) {
    await tx
        .update(payrollTable)
        .set({
            status: "Draft",
            updatedAt: now,
        })
        .where(eq(payrollTable.id, payroll.id));

    const advancesInPeriod: AdvanceInPeriodRow[] = await tx
        .select({
            id: advanceTable.id,
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(advanceRepaymentInPayrollWindowWhere(payroll));

    const installmentPaidIds = advancesInPeriod
        .filter((advance) => advance.status === "Installment Paid")
        .map((advance) => advance.id);

    if (installmentPaidIds.length > 0) {
        await tx
            .update(advanceTable)
            .set({
                status: "Installment Loan",
                updatedAt: now,
            })
            .where(inArray(advanceTable.id, installmentPaidIds));
    }

    await syncAdvanceRequestStatusesFromAdvances(tx, advancesInPeriod, now);

    await updateTimesheetsInPayrollPeriod(tx, payroll, {
        fromStatus: "Timesheet Paid",
        toStatus: "Timesheet Unpaid",
        now,
    });
}
