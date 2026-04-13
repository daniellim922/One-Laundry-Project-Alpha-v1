import { asc, eq } from "drizzle-orm";

import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { db } from "@/lib/db";
import type { PayrollSelectionRow } from "@/services/payroll/list-draft-payrolls-for-settlement";

export async function listPayrollsForDownload(): Promise<PayrollSelectionRow[]> {
    const rows = await db
        .select({
            payroll: payrollTable,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .orderBy(asc(workerTable.name), asc(payrollTable.periodStart));

    return rows.map((row) => ({
        ...row.payroll,
        workerName: row.workerName,
        employmentType: row.employmentType,
        employmentArrangement: row.employmentArrangement,
    }));
}
