import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import type { MonthlyWorkerAmountAggregatesPayload } from "@/types/monthly-worker-amount-aggregates";

export async function getPayrollMonthlyGrandTotalAggregates(): Promise<MonthlyWorkerAmountAggregatesPayload> {
    const maxYear = new Date().getFullYear();
    const minYear = maxYear - 4;
    const yearOptions = Array.from({ length: 5 }, (_, i) => maxYear - i);

    const yearExpr = sql<number>`extract(year from ${payrollTable.payrollDate})::int`;
    const monthExpr = sql<number>`extract(month from ${payrollTable.payrollDate})::int`;

    const raw = await db
        .select({
            workerId: payrollTable.workerId,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            year: yearExpr,
            month: monthExpr,
            totalAmount: sql<number>`coalesce(sum(${payrollVoucherTable.grandTotal}), 0)::double precision`,
        })
        .from(payrollTable)
        .innerJoin(
            payrollVoucherTable,
            eq(payrollTable.payrollVoucherId, payrollVoucherTable.id),
        )
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(
            and(
                eq(payrollTable.status, "Settled"),
                gte(payrollTable.payrollDate, `${minYear}-01-01`),
                lte(payrollTable.payrollDate, `${maxYear}-12-31`),
            ),
        )
        .groupBy(
            payrollTable.workerId,
            workerTable.name,
            employmentTable.employmentType,
            employmentTable.employmentArrangement,
            yearExpr,
            monthExpr,
        );

    return {
        defaultYear: maxYear,
        yearOptions,
        rows: raw.map((r) => ({
            workerId: r.workerId,
            workerName: r.workerName,
            employmentType: r.employmentType,
            employmentArrangement: r.employmentArrangement,
            year: Number(r.year),
            month: Number(r.month),
            totalAmount: Number(r.totalAmount),
        })),
    };
}
