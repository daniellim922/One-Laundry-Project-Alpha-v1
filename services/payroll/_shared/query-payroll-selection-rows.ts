import { asc, eq } from "drizzle-orm";

import { payrollTable, type SelectPayroll } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { db } from "@/lib/db";
import type {
    PayrollStatus,
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
} from "@/types/status";

export type PayrollSelectionRow = SelectPayroll & {
    workerName: string;
    status: PayrollStatus;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    voucherNumber: string | null;
};

export async function queryPayrollSelectionRows(
    statusFilter?: PayrollStatus,
): Promise<PayrollSelectionRow[]> {
    const baseQuery = db
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
        );

    const filtered =
        statusFilter !== undefined
            ? baseQuery.where(eq(payrollTable.status, statusFilter))
            : baseQuery;

    const rows = await filtered.orderBy(
        asc(workerTable.name),
        asc(payrollTable.periodStart),
    );

    return rows.map((row) => ({
        ...row.payroll,
        workerName: row.workerName,
        employmentType: row.employmentType,
        employmentArrangement: row.employmentArrangement,
        voucherNumber: row.voucherNumber,
    }));
}
