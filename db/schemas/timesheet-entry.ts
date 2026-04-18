/** Drizzle-derived Zod via `drizzle-zod` (same pattern as `worker-employment.ts`). Calendar and time fields use strings for UI (`DatePickerInput`, `TimesheetTimeField`). */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { timesheetTable } from "@/db/tables/timesheetTable";
import { isClockOutAfterClockIn } from "@/utils/payroll/payroll-utils";
import { isIsoDateStrict } from "@/utils/time/calendar-date";
import { isTimesheetWireTimeStrict } from "@/utils/timesheet/hm-time";

/** Payload for create/update timesheet entry (no generated columns). */
export const timesheetEntryFormSchema = createInsertSchema(timesheetTable, {
    workerId: z.string().min(1, "Worker is required"),
    dateIn: z
        .string()
        .min(1, "Date in is required")
        .refine((value) => isIsoDateStrict(value), {
            message: "Date in is invalid",
        }),
    dateOut: z
        .string()
        .min(1, "Date out is required")
        .refine((value) => isIsoDateStrict(value), {
            message: "Date out is invalid",
        }),
    timeIn: z
        .string()
        .min(1, "Time in is required")
        .refine((value) => isTimesheetWireTimeStrict(value), {
            message: "Time in must be in HH:MM or HH:MM:SS format",
        }),
    timeOut: z
        .string()
        .min(1, "Time out is required")
        .refine((value) => isTimesheetWireTimeStrict(value), {
            message: "Time out must be in HH:MM or HH:MM:SS format",
        }),
})
    .pick({
        workerId: true,
        dateIn: true,
        dateOut: true,
        timeIn: true,
        timeOut: true,
    })
    .superRefine((values, ctx) => {
        if (values.dateIn && values.dateOut && values.dateOut < values.dateIn) {
            ctx.addIssue({
                code: "custom",
                path: ["dateOut"],
                message: "Date out must be on or after date in",
            });
        }
        if (
            values.dateIn &&
            values.dateOut &&
            values.timeIn &&
            values.timeOut &&
            isIsoDateStrict(values.dateIn) &&
            isIsoDateStrict(values.dateOut) &&
            isTimesheetWireTimeStrict(values.timeIn) &&
            isTimesheetWireTimeStrict(values.timeOut) &&
            !isClockOutAfterClockIn(
                values.dateIn,
                values.timeIn,
                values.dateOut,
                values.timeOut,
            )
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["timeOut"],
                message:
                    "Time out must be after time in for the chosen dates (use the next calendar day for date out if the shift crosses midnight)",
            });
        }
    });

export type TimesheetEntryFormValues = z.infer<typeof timesheetEntryFormSchema>;
