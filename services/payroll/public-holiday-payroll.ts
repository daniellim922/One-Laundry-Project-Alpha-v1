import { and, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { publicHolidayTable } from "@/db/tables/publicHolidayTable";

type PublicHolidayQueryExecutor = Pick<typeof db, "select">;

export type PayrollApplicablePublicHoliday = {
    date: string;
    name: string;
};

type PayrollPublicHolidayInput = {
    periodStart: string;
    periodEnd: string;
    workedDateIns: string[];
};

function workedDateSet(workedDateIns: string[]) {
    return new Set(
        workedDateIns
            .map((dateIn) => dateIn.trim())
            .filter((dateIn) => dateIn.length > 0),
    );
}

export async function listPayrollPublicHolidays(
    input: PayrollPublicHolidayInput,
    executor: PublicHolidayQueryExecutor = db,
): Promise<PayrollApplicablePublicHoliday[]> {
    const workedDates = workedDateSet(input.workedDateIns);

    if (workedDates.size === 0) {
        return [];
    }

    const holidays = await executor
        .select({
            date: publicHolidayTable.date,
            name: publicHolidayTable.name,
        })
        .from(publicHolidayTable)
        .where(
            and(
                gte(publicHolidayTable.date, input.periodStart),
                lte(publicHolidayTable.date, input.periodEnd),
            ),
        );

    return holidays
        .filter((h) => workedDates.has(h.date))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export async function countPayrollPublicHolidays(
    input: PayrollPublicHolidayInput,
    executor: PublicHolidayQueryExecutor = db,
) {
    const list = await listPayrollPublicHolidays(input, executor);
    return list.length;
}
