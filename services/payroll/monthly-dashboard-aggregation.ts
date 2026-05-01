import { and, eq, gte, lte, sql } from "drizzle-orm";

import { payrollTable } from "@/db/tables/payrollTable";

/** Last five calendar years ending at `now`, used by dashboard payroll aggregate queries. */
export function payrollDashboardYearWindow(now = new Date()) {
    const maxYear = now.getFullYear();
    const minYear = maxYear - 4;
    const yearOptions = Array.from({ length: 5 }, (_, i) => maxYear - i);
    return { maxYear, minYear, yearOptions };
}

export function payrollPeriodEndYearMonthExtract() {
    const yearExpr = sql<number>`extract(year from ${payrollTable.periodEnd})::int`;
    const monthExpr = sql<number>`extract(month from ${payrollTable.periodEnd})::int`;
    return { yearExpr, monthExpr };
}

export function settledPayrollOverlappingYearsWhere(minYear: number, maxYear: number) {
    return and(
        eq(payrollTable.status, "Settled"),
        gte(payrollTable.periodEnd, `${minYear}-01-01`),
        lte(payrollTable.periodStart, `${maxYear}-12-31`),
    );
}
