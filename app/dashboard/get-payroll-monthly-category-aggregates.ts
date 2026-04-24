import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { DASHBOARD_PAYROLL_NAMED_WORKER_NAMES_NORMALIZED } from "@/types/monthly-payroll-category-aggregates";
import type { MonthlyPayrollCategoryAggregatesPayload } from "@/types/monthly-payroll-category-aggregates";

const namedListSql = sql.join(
    DASHBOARD_PAYROLL_NAMED_WORKER_NAMES_NORMALIZED.map(
        (n) => sql`${n}`,
    ),
    sql`, `,
);

const workerNameNormalized = sql<string>`lower(trim(${workerTable.name}))`;

const isNamedWorker = sql`${workerNameNormalized} in (${namedListSql})`;

export async function getPayrollMonthlyCategoryAggregates(): Promise<MonthlyPayrollCategoryAggregatesPayload> {
    const maxYear = new Date().getFullYear();
    const minYear = maxYear - 4;
    const yearOptions = Array.from({ length: 5 }, (_, i) => maxYear - i);

    const yearExpr = sql<number>`extract(year from ${payrollTable.periodEnd})::int`;
    const monthExpr = sql<number>`extract(month from ${payrollTable.periodEnd})::int`;

    const raw = await db
        .select({
            year: yearExpr,
            month: monthExpr,
            ptForeignSubtotal: sql<number>`coalesce(sum(case
                when ${employmentTable.employmentType} = 'Part Time'
                 and ${employmentTable.employmentArrangement} = 'Foreign Worker'
                 and not (${isNamedWorker})
                then ${payrollVoucherTable.subTotal}
                else 0
            end), 0)::double precision`,
            ftForeignSubtotal: sql<number>`coalesce(sum(case
                when ${employmentTable.employmentType} = 'Full Time'
                 and ${employmentTable.employmentArrangement} = 'Foreign Worker'
                 and not (${isNamedWorker})
                then ${payrollVoucherTable.subTotal}
                else 0
            end), 0)::double precision`,
            namedWorkersSubtotal: sql<number>`coalesce(sum(case
                when ${isNamedWorker}
                then ${payrollVoucherTable.subTotal}
                else 0
            end), 0)::double precision`,
            ftLocalCpf: sql<number>`coalesce(sum(case
                when ${employmentTable.employmentType} = 'Full Time'
                 and ${employmentTable.employmentArrangement} = 'Local Worker'
                then ${payrollVoucherTable.cpf}
                else 0
            end), 0)::double precision`,
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
                gte(payrollTable.periodEnd, `${minYear}-01-01`),
                lte(payrollTable.periodStart, `${maxYear}-12-31`),
            ),
        )
        .groupBy(yearExpr, monthExpr);

    return {
        defaultYear: maxYear,
        yearOptions,
        rows: raw.map((r) => ({
            year: Number(r.year),
            month: Number(r.month),
            ptForeignSubtotal: Number(r.ptForeignSubtotal),
            ftForeignSubtotal: Number(r.ftForeignSubtotal),
            namedWorkersSubtotal: Number(r.namedWorkersSubtotal),
            ftLocalCpf: Number(r.ftLocalCpf),
        })),
    };
}
