import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    dashboardYearWindow,
    yearMonthSqlFromColumn,
} from "@/app/dashboard/_shared/dashboard-year-window";
import type { MonthlyWorkerAmountAggregatesPayload } from "@/types/monthly-worker-amount-aggregates";

export async function getAdvanceMonthlyRepaymentAggregates(): Promise<MonthlyWorkerAmountAggregatesPayload> {
    const { maxYear, minYear, yearOptions } = dashboardYearWindow();
    const { yearExpr, monthExpr } = yearMonthSqlFromColumn(
        advanceTable.repaymentDate,
    );

    const raw = await db
        .select({
            workerId: advanceRequestTable.workerId,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            year: yearExpr,
            month: monthExpr,
            grandTotalAmount: sql<number>`coalesce(sum(${advanceTable.amount}), 0)::double precision`,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .innerJoin(workerTable, eq(advanceRequestTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
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
            grandTotalAmount: Number(r.grandTotalAmount),
            subTotalAmount: 0,
        })),
    };
}
