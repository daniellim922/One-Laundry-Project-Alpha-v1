import { sql } from "drizzle-orm";

import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { payrollSettledAggregateQueryBuilder } from "@/app/dashboard/_shared/payroll-aggregate-base";
import type {
    MonthlyWorkerAmountAggregatesPayload,
    MonthlyWorkerAmountRow,
} from "@/types/monthly-worker-amount-aggregates";

export async function getPayrollMonthlyGrandTotalAggregates(): Promise<MonthlyWorkerAmountAggregatesPayload> {
    const { query, maxYear, yearOptions, yearExpr, monthExpr } =
        payrollSettledAggregateQueryBuilder(({ yearExpr, monthExpr }) => ({
            workerId: payrollTable.workerId,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            year: yearExpr,
            month: monthExpr,
            grandTotalAmount: sql<number>`coalesce(sum(${payrollVoucherTable.grandTotal}), 0)::double precision`,
            subTotalAmount: sql<number>`coalesce(sum(${payrollVoucherTable.subTotal}), 0)::double precision`,
        }));

    const raw = (await query.groupBy(
        payrollTable.workerId,
        workerTable.name,
        employmentTable.employmentType,
        employmentTable.employmentArrangement,
        yearExpr,
        monthExpr,
    )) as {
        workerId: string;
        workerName: string;
        employmentType: MonthlyWorkerAmountRow["employmentType"];
        employmentArrangement: MonthlyWorkerAmountRow["employmentArrangement"];
        year: number;
        month: number;
        grandTotalAmount: number;
        subTotalAmount: number;
    }[];

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
