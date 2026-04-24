import { db } from "@/lib/db";
import { publicHolidayTable } from "@/db/tables/publicHolidayTable";
import { SEED_TIMESTAMP } from "./constants";

export const publicHolidays = [
    // 2025
    { date: "2025-01-01", name: "New Year's Day" },
    { date: "2025-01-29", name: "Chinese New Year" },
    { date: "2025-01-30", name: "Chinese New Year" },
    { date: "2025-03-31", name: "Hari Raya Puasa" },
    { date: "2025-04-18", name: "Good Friday" },
    { date: "2025-05-01", name: "Labour Day" },
    { date: "2025-05-12", name: "Vesak Day" },
    { date: "2025-06-07", name: "Hari Raya Haji" },
    { date: "2025-08-09", name: "National Day" },
    { date: "2025-10-20", name: "Deepavali" },
    { date: "2025-12-25", name: "Christmas Day" },
    // 2026
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-02-17", name: "Chinese New Year" },
    { date: "2026-02-18", name: "Chinese New Year" },
    { date: "2026-03-21", name: "Hari Raya Puasa" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-05-01", name: "Labour Day" },
    { date: "2026-05-27", name: "Hari Raya Haji" },
    { date: "2026-05-31", name: "Vesak Day" },
    { date: "2026-08-09", name: "National Day" },
    { date: "2026-11-08", name: "Deepavali" },
    { date: "2026-12-25", name: "Christmas Day" },
] as const;

export async function seedPublicHolidays(): Promise<void> {
    const inserts = publicHolidays.map((h) => ({
        date: h.date,
        name: h.name,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
    }));

    await db.insert(publicHolidayTable).values(inserts);
}
