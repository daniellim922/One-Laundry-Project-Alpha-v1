import { and, eq, gte, lte } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getAdvancesForPayrollPeriod } from "@/utils/advance/queries";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { requirePermission } from "@/utils/permissions/require-permission";

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function dateKey(d: string | Date): string {
    if (d instanceof Date) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    }
    return s;
}

function dateFromKey(key: string): Date {
    return new Date(`${key}T00:00:00`);
}

export async function getPayrollDetailData(id: string) {
    await requirePermission("Payroll", "read");

    const [row] = await db
        .select({
            payroll: payrollTable,
            worker: workerTable,
            employment: employmentTable,
            voucher: payrollVoucherTable,
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
        .where(eq(payrollTable.id, id))
        .limit(1);

    if (!row) notFound();

    const { payroll, worker, employment, voucher } = row;

    const entries = await db
        .select()
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
            ),
        )
        .orderBy(timesheetTable.dateIn);

    const presentDateIns = new Set(entries.map((e) => dateKey(e.dateIn)));
    const missingDateIns: string[] = [];
    {
        const start = dateFromKey(dateKey(payroll.periodStart));
        const end = dateFromKey(dateKey(payroll.periodEnd));
        const cursor = new Date(start);
        while (cursor <= end) {
            const key = dateKey(cursor);
            if (!presentDateIns.has(key)) missingDateIns.push(key);
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    const advances = await getAdvancesForPayrollPeriod(
        payroll.workerId,
        payroll.periodStart,
        payroll.periodEnd,
    );

    return { payroll, worker, employment, voucher, entries, missingDateIns, advances };
}
