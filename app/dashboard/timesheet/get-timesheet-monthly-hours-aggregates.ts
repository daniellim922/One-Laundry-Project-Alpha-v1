import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    dashboardYearWindow,
    yearMonthSqlFromColumn,
} from "@/app/dashboard/_shared/dashboard-year-window";
import type { TimesheetMonthlyHoursAggregatesPayload } from "@/types/timesheet-monthly-hours-aggregates";

export async function getTimesheetMonthlyHoursAggregates(): Promise<TimesheetMonthlyHoursAggregatesPayload> {
    const { maxYear, minYear, yearOptions } = dashboardYearWindow();
    const { yearExpr, monthExpr } = yearMonthSqlFromColumn(
        timesheetTable.dateIn,
    );

    const raw = await db
        .select({
            workerId: timesheetTable.workerId,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            year: yearExpr,
            month: monthExpr,
            totalHours: sql<number>`coalesce(sum(${timesheetTable.hours}), 0)::double precision`,
        })
        .from(timesheetTable)
        .innerJoin(workerTable, eq(timesheetTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(
            and(
                gte(timesheetTable.dateIn, `${minYear}-01-01`),
                lte(timesheetTable.dateIn, `${maxYear}-12-31`),
            ),
        )
        .groupBy(
            timesheetTable.workerId,
            workerTable.name,
            employmentTable.employmentType,
            employmentTable.employmentArrangement,
            yearExpr,
            monthExpr,
        );

    return {
        defaultYear: maxYear,
        yearOptions,
        rows: raw.map((r) => ({
            workerId: r.workerId,
            workerName: r.workerName,
            employmentType: r.employmentType,
            employmentArrangement: r.employmentArrangement,
            year: Number(r.year),
            month: Number(r.month),
            totalHours: Number(r.totalHours),
        })),
    };
}
