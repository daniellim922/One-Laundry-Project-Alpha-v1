import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    payrollDashboardYearWindow,
    payrollPeriodEndYearMonthExtract,
    settledPayrollOverlappingYearsWhere,
} from "@/services/payroll/monthly-dashboard-aggregation";
import type { MonthlyWorkerAmountAggregatesPayload } from "@/types/monthly-worker-amount-aggregates";

export async function getPayrollMonthlyGrandTotalAggregates(): Promise<MonthlyWorkerAmountAggregatesPayload> {
    const { maxYear, minYear, yearOptions } = payrollDashboardYearWindow();
    const { yearExpr, monthExpr } = payrollPeriodEndYearMonthExtract();

    const raw = await db
        .select({
            workerId: payrollTable.workerId,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            year: yearExpr,
            month: monthExpr,
            grandTotalAmount: sql<number>`coalesce(sum(${payrollVoucherTable.grandTotal}), 0)::double precision`,
            subTotalAmount: sql<number>`coalesce(sum(${payrollVoucherTable.subTotal}), 0)::double precision`,
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
            settledPayrollOverlappingYearsWhere(minYear, maxYear),
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
            grandTotalAmount: Number(r.grandTotalAmount),
            subTotalAmount: Number(r.subTotalAmount),
        })),
    };
}
