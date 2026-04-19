import { and, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { publicHolidayTable } from "@/db/tables/publicHolidayTable";

type PublicHolidayQueryExecutor = Pick<typeof db, "select">;

export async function countPayrollPublicHolidays(
    input: {
        periodStart: string;
        periodEnd: string;
        workedDateIns: string[];
    },
    executor: PublicHolidayQueryExecutor = db,
) {
    const workedDates = new Set(
        input.workedDateIns
            .map((dateIn) => dateIn.trim())
            .filter((dateIn) => dateIn.length > 0),
    );

    if (workedDates.size === 0) {
        return 0;
    }

    const holidays = await executor
        .select({
            date: publicHolidayTable.date,
        })
        .from(publicHolidayTable)
        .where(
            and(
                gte(publicHolidayTable.date, input.periodStart),
                lte(publicHolidayTable.date, input.periodEnd),
            ),
        );

    return holidays.reduce((count, holiday) => {
        return count + (workedDates.has(holiday.date) ? 1 : 0);
    }, 0);
}
