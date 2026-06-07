import { asc, desc, eq } from "drizzle-orm";

import { payrollTable, type SelectPayroll } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { db } from "@/lib/db";
import type {
    PayrollStatus,
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerShiftPattern,
} from "@/types/status";

export type PayrollSelectionRow = SelectPayroll & {
    workerName: string;
    status: PayrollStatus;
    employmentType: WorkerEmploymentType;
    shiftPattern: WorkerShiftPattern;
    employmentArrangement: WorkerEmploymentArrangement;
    voucherNumber: string | null;
};

function normalizeVoucherEmploymentType(
    value: string | null,
): WorkerEmploymentType {
    return value === "Part Time" ? "Part Time" : "Full Time";
}

function normalizeVoucherEmploymentArrangement(
    value: string | null,
): WorkerEmploymentArrangement {
    return value === "Foreign Worker" ? "Foreign Worker" : "Local Worker";
}

/**
 * Payroll rows with worker / voucher joins and the same ordering
 * as the All payrolls dashboard table. Optional status narrows the set (e.g. Draft for settlement).
 */
export async function queryPayrollRowsWithWorkerForList(
    statusFilter?: PayrollStatus,
): Promise<PayrollSelectionRow[]> {
    const baseQuery = db
        .select({
            payroll: payrollTable,
            workerName: workerTable.name,
            employmentType: payrollVoucherTable.employmentType,
            shiftPattern: payrollVoucherTable.shiftPattern,
            employmentArrangement: payrollVoucherTable.employmentArrangement,
            voucherNumber: payrollVoucherTable.voucherNumber,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            payrollVoucherTable,
            eq(payrollTable.payrollVoucherId, payrollVoucherTable.id),
        );

    const filtered =
        statusFilter !== undefined
            ? baseQuery.where(eq(payrollTable.status, statusFilter))
            : baseQuery;

    const rows = await filtered.orderBy(
        asc(payrollTable.status),
        desc(payrollTable.payrollDate),
        asc(payrollVoucherTable.employmentArrangement),
        asc(payrollVoucherTable.employmentType),
        asc(workerTable.name),
    );

    return rows.map((row) => ({
        ...row.payroll,
        workerName: row.workerName,
        employmentType: normalizeVoucherEmploymentType(row.employmentType),
        shiftPattern: row.shiftPattern ?? "Day Shift",
        employmentArrangement: normalizeVoucherEmploymentArrangement(
            row.employmentArrangement,
        ),
        voucherNumber: row.voucherNumber,
    }));
}

export async function queryPayrollSelectionRows(
    statusFilter?: PayrollStatus,
): Promise<PayrollSelectionRow[]> {
    return queryPayrollRowsWithWorkerForList(statusFilter);
}
