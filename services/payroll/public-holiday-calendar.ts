import { and, asc, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    formatPublicHolidayZodError,
    publicHolidayYearInputSchema,
    type PublicHolidayYearInput,
} from "@/db/schemas/public-holiday";
import { publicHolidayTable } from "@/db/tables/publicHolidayTable";

type PublicHolidayListInput = {
    year: number;
};

type PublicHolidayPersistenceExecutor = Pick<
    typeof db,
    "select" | "transaction"
>;

function yearRange(year: number) {
    return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
    };
}

export async function listPublicHolidaysForYear(
    input: PublicHolidayListInput,
    executor: PublicHolidayPersistenceExecutor = db,
) {
    const { start, end } = yearRange(input.year);

    return executor
        .select({
            id: publicHolidayTable.id,
            date: publicHolidayTable.date,
            name: publicHolidayTable.name,
        })
        .from(publicHolidayTable)
        .where(
            and(
                gte(publicHolidayTable.date, start),
                lte(publicHolidayTable.date, end),
            ),
        )
        .orderBy(asc(publicHolidayTable.date));
}

export async function savePublicHolidaysForYear(
    input: PublicHolidayYearInput,
    executor: PublicHolidayPersistenceExecutor = db,
): Promise<{ success: true; saved: number } | { error: string }> {
    const parsed = publicHolidayYearInputSchema.safeParse(input);

    if (!parsed.success) {
        return {
            error: formatPublicHolidayZodError(parsed.error),
        };
    }

    const {
        year,
        holidays,
    } = parsed.data;
    const { start, end } = yearRange(year);

    await executor.transaction(async (tx) => {
        await tx
            .delete(publicHolidayTable)
            .where(
                and(
                    gte(publicHolidayTable.date, start),
                    lte(publicHolidayTable.date, end),
                ),
            );

        if (holidays.length === 0) {
            return;
        }

        await tx.insert(publicHolidayTable).values(
            holidays.map((holiday) => ({
                date: holiday.date,
                name: holiday.name,
            })),
        );
    });

    return {
        success: true,
        saved: holidays.length,
    };
}
