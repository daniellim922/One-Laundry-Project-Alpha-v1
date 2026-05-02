import { and, eq, gte, lte } from "drizzle-orm";

import { payrollTable } from "@/db/tables/payrollTable";

export function settledPayrollOverlappingYearsWhere(minYear: number, maxYear: number) {
    return and(
        eq(payrollTable.status, "Settled"),
        gte(payrollTable.periodEnd, `${minYear}-01-01`),
        lte(payrollTable.periodStart, `${maxYear}-12-31`),
    );
}
