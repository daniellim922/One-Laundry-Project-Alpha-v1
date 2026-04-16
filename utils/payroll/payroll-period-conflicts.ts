import { and, asc, eq, gte, lte, not } from "drizzle-orm";

import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";
import type { db } from "@/lib/db";
import type { PayrollStatus } from "@/types/status";

export type PayrollPeriodConflict = {
    payrollId: string;
    workerId: string;
    workerName: string;
    periodStart: string;
    periodEnd: string;
    status: PayrollStatus;
};

type PayrollPeriodConflictExecutor = Pick<typeof db, "select">;

export function validatePayrollPeriodRange(input: {
    periodStart: string;
    periodEnd: string;
}): { success: true } | { error: string } {
    if (input.periodEnd < input.periodStart) {
        return { error: "Period end must be on or after period start" };
    }
    return { success: true };
}

export function hasInclusivePeriodOverlap(input: {
    existingPeriodStart: string;
    existingPeriodEnd: string;
    candidatePeriodStart: string;
    candidatePeriodEnd: string;
}): boolean {
    return (
        input.existingPeriodStart <= input.candidatePeriodEnd &&
        input.existingPeriodEnd >= input.candidatePeriodStart
    );
}

export async function findPayrollPeriodConflicts(
    executor: PayrollPeriodConflictExecutor,
    input: {
        workerId: string;
        periodStart: string;
        periodEnd: string;
        excludePayrollId?: string;
    },
): Promise<PayrollPeriodConflict[]> {
    const clauses = [
        eq(payrollTable.workerId, input.workerId),
        lte(payrollTable.periodStart, input.periodEnd),
        gte(payrollTable.periodEnd, input.periodStart),
    ];

    if (input.excludePayrollId) {
        clauses.push(not(eq(payrollTable.id, input.excludePayrollId)));
    }

    const rows = await executor
        .select({
            payrollId: payrollTable.id,
            workerId: payrollTable.workerId,
            workerName: workerTable.name,
            periodStart: payrollTable.periodStart,
            periodEnd: payrollTable.periodEnd,
            status: payrollTable.status,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .where(and(...clauses))
        .orderBy(
            asc(payrollTable.periodStart),
            asc(payrollTable.periodEnd),
            asc(payrollTable.id),
        );

    return rows.map((row) => ({
        payrollId: row.payrollId,
        workerId: row.workerId,
        workerName: row.workerName,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        status: row.status,
    }));
}

