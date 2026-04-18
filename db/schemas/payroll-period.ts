/** Drizzle-derived Zod via `drizzle-zod` (same pattern as `worker-employment.ts`). Date columns use ISO `YYYY-MM-DD` strings for form/API parity with `DatePickerInput`. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { payrollTable } from "@/db/tables/payrollTable";

const isoDate = (label: string) =>
    z
        .string()
        .min(1, `${label} is required`)
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const payrollPeriodFormSchema = createInsertSchema(payrollTable, {
    periodStart: isoDate("Period start"),
    periodEnd: isoDate("Period end"),
    payrollDate: isoDate("Payroll date"),
})
    .pick({
        periodStart: true,
        periodEnd: true,
        payrollDate: true,
    })
    .superRefine((values, ctx) => {
        if (values.periodEnd < values.periodStart) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["periodEnd"],
                message: "Period end must be on or after period start",
            });
        }
    });

export type PayrollPeriodFormValues = z.infer<typeof payrollPeriodFormSchema>;
