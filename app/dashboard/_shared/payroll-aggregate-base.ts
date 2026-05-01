import { eq } from "drizzle-orm";

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

export function payrollDashboardAggregateContext() {
    const { maxYear, minYear, yearOptions } = payrollDashboardYearWindow();
    const { yearExpr, monthExpr } = payrollPeriodEndYearMonthExtract();
    return { maxYear, minYear, yearOptions, yearExpr, monthExpr };
}

type AggregateYearMonthCols = Pick<
    ReturnType<typeof payrollDashboardAggregateContext>,
    "yearExpr" | "monthExpr"
>;

/** Shared `select → payroll + voucher + worker + employment → settled window` builder. */
export function payrollSettledAggregateQueryBuilder(
    buildSelect: (cols: AggregateYearMonthCols) => Parameters<typeof db.select>[0],
) {
    const { maxYear, minYear, yearOptions, yearExpr, monthExpr } =
        payrollDashboardAggregateContext();

    const query = db
        .select(buildSelect({ yearExpr, monthExpr }))
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
        .where(settledPayrollOverlappingYearsWhere(minYear, maxYear));

    return {
        query,
        maxYear,
        yearOptions,
        yearExpr,
        monthExpr,
    };
}
