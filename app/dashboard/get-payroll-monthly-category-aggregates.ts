import { sql } from "drizzle-orm";

import { employmentTable } from "@/db/tables/employmentTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { payrollSettledAggregateQueryBuilder } from "@/app/dashboard/_shared/payroll-aggregate-base";
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
    const { query, maxYear, yearOptions, yearExpr, monthExpr } =
        payrollSettledAggregateQueryBuilder(({ yearExpr, monthExpr }) => ({
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
        }));

    const raw = await query.groupBy(yearExpr, monthExpr);

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
