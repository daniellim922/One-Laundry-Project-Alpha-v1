import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
} from "@/types/status";

export type TimesheetMonthlyHoursAggregateRow = {
    workerId: string;
    workerName: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    year: number;
    month: number;
    totalHours: number;
};

export type TimesheetMonthlyHoursAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: TimesheetMonthlyHoursAggregateRow[];
};

export async function getTimesheetMonthlyHoursAggregates(): Promise<TimesheetMonthlyHoursAggregatesPayload> {
    const maxYear = new Date().getFullYear();
    const minYear = maxYear - 4;
    const yearOptions = Array.from({ length: 5 }, (_, i) => maxYear - i);

    const yearExpr = sql<number>`extract(year from ${timesheetTable.dateIn})::int`;
    const monthExpr = sql<number>`extract(month from ${timesheetTable.dateIn})::int`;

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
