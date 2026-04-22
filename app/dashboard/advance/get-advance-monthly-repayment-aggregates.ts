import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { workerTable } from "@/db/tables/workerTable";
import type { AdvanceMonthlyRepaymentAggregatesPayload } from "@/types/advance-monthly-repayment-aggregates";

export async function getAdvanceMonthlyRepaymentAggregates(): Promise<AdvanceMonthlyRepaymentAggregatesPayload> {
    const maxYear = new Date().getFullYear();
    const minYear = maxYear - 4;
    const yearOptions = Array.from({ length: 5 }, (_, i) => maxYear - i);

    const yearExpr = sql<number>`extract(year from ${advanceTable.repaymentDate})::int`;
    const monthExpr = sql<number>`extract(month from ${advanceTable.repaymentDate})::int`;

    const raw = await db
        .select({
            workerId: advanceRequestTable.workerId,
            workerName: workerTable.name,
            year: yearExpr,
            month: monthExpr,
            totalAmount: sql<number>`coalesce(sum(${advanceTable.amount}), 0)::double precision`,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .innerJoin(workerTable, eq(advanceRequestTable.workerId, workerTable.id))
        .where(
            and(
                isNotNull(advanceTable.repaymentDate),
                gte(advanceTable.repaymentDate, `${minYear}-01-01`),
                lte(advanceTable.repaymentDate, `${maxYear}-12-31`),
            ),
        )
        .groupBy(
            advanceRequestTable.workerId,
            workerTable.name,
            yearExpr,
            monthExpr,
        );

    return {
        defaultYear: maxYear,
        yearOptions,
        rows: raw.map((r) => ({
            workerId: r.workerId,
            workerName: r.workerName,
            year: Number(r.year),
            month: Number(r.month),
            totalAmount: Number(r.totalAmount),
        })),
    };
}
