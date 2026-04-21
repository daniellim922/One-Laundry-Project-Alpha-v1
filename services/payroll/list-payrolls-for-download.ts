import { asc, eq } from "drizzle-orm";

import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { db } from "@/lib/db";
import type { PayrollSelectionRow } from "@/services/payroll/list-draft-payrolls-for-settlement";

export async function listPayrollsForDownload(): Promise<PayrollSelectionRow[]> {
    const rows = await db
        .select({
            payroll: payrollTable,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            voucherNumber: payrollVoucherTable.voucherNumber,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .innerJoin(
            payrollVoucherTable,
            eq(payrollTable.payrollVoucherId, payrollVoucherTable.id),
        )
        .orderBy(asc(workerTable.name), asc(payrollTable.periodStart));

    return rows.map((row) => ({
        ...row.payroll,
        workerName: row.workerName,
        employmentType: row.employmentType,
        employmentArrangement: row.employmentArrangement,
        voucherNumber: row.voucherNumber,
    }));
}
