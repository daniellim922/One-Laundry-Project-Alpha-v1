import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { publicHolidayTable } from "@/db/tables/publicHolidayTable";

export const PUBLIC_HOLIDAY_MIN_YEAR = 2000;
export const PUBLIC_HOLIDAY_MAX_YEAR = 2100;

const isoDate = (label: string) =>
    z
        .string()
        .min(1, `${label} is required`)
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const publicHolidayRowSchema = createInsertSchema(publicHolidayTable, {
    date: isoDate("Holiday date"),
    name: (schema) => schema.trim().min(1, "Holiday name is required"),
})
    .pick({
        date: true,
        name: true,
    })
    .transform((row) => ({
        date: row.date,
        name: row.name.trim(),
    }));

export const publicHolidayYearInputSchema = z
    .object({
        year: z
            .number({
                error: () => ({
                    message: `Year must be between ${PUBLIC_HOLIDAY_MIN_YEAR} and ${PUBLIC_HOLIDAY_MAX_YEAR}`,
                }),
            })
            .int(
                `Year must be between ${PUBLIC_HOLIDAY_MIN_YEAR} and ${PUBLIC_HOLIDAY_MAX_YEAR}`,
            )
            .min(
                PUBLIC_HOLIDAY_MIN_YEAR,
                `Year must be between ${PUBLIC_HOLIDAY_MIN_YEAR} and ${PUBLIC_HOLIDAY_MAX_YEAR}`,
            )
            .max(
                PUBLIC_HOLIDAY_MAX_YEAR,
                `Year must be between ${PUBLIC_HOLIDAY_MIN_YEAR} and ${PUBLIC_HOLIDAY_MAX_YEAR}`,
            ),
        holidays: z.array(publicHolidayRowSchema),
    })
    .superRefine((values, ctx) => {
        const seenDates = new Set<string>();

        values.holidays.forEach((holiday, index) => {
            if (!holiday.date.startsWith(`${values.year}-`)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["holidays", index, "date"],
                    message: "Holiday date must belong to the selected year",
                });
            }

            if (seenDates.has(holiday.date)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["holidays", index, "date"],
                    message: "Duplicate holiday date",
                });
                return;
            }

            seenDates.add(holiday.date);
        });
    });

export type PublicHolidayYearInput = z.infer<typeof publicHolidayYearInputSchema>;
export type PublicHolidayRowInput = PublicHolidayYearInput["holidays"][number];

export function formatPublicHolidayZodError(error: z.ZodError): string {
    return error.issues[0]?.message ?? "Invalid input";
}
