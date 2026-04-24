import { and, eq, gte, lte } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getAdvancesForPayrollPeriod } from "@/utils/advance/queries";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import {
    listMissingTimesheetDateIns,
    timesheetDateInKey,
} from "@/utils/payroll/missing-timesheet-dates";
import { listPayrollPublicHolidays } from "@/services/payroll/public-holiday-payroll";

export async function getPayrollDetailData(id: string) {
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

    const missingDateIns = listMissingTimesheetDateIns({
        periodStart: payroll.periodStart,
        periodEnd: payroll.periodEnd,
        presentDateInKeys: entries.map((e) => timesheetDateInKey(e.dateIn)),
    });

    const advances = await getAdvancesForPayrollPeriod(
        payroll.workerId,
        payroll.periodStart,
        payroll.periodEnd,
    );

    const applicablePublicHolidays = await listPayrollPublicHolidays({
        periodStart: payroll.periodStart,
        periodEnd: payroll.periodEnd,
        workedDateIns: entries.map((e) => e.dateIn),
    });

    return {
        payroll,
        worker,
        employment,
        voucher,
        entries,
        missingDateIns,
        advances,
        applicablePublicHolidays,
    };
}
