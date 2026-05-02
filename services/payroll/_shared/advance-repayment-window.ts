import { and, eq, gte, lte } from "drizzle-orm";

import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";

export type AdvanceRepaymentPayrollWindow = {
    workerId: string;
    periodStart: string;
    periodEnd: string;
};

/** Shared join filter: advances repaid within a payroll period window for a worker. */
export function advanceRepaymentInPayrollWindowWhere(
    payroll: AdvanceRepaymentPayrollWindow,
) {
    return and(
        eq(advanceRequestTable.workerId, payroll.workerId),
        gte(advanceTable.repaymentDate, payroll.periodStart),
        lte(advanceTable.repaymentDate, payroll.periodEnd),
    );
}
