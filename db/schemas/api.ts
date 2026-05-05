/** HTTP request Zod schemas derived with `drizzle-zod`. Nullable/select columns are narrowed to required numbers where the API contract demands it. */
import { createSelectSchema } from "drizzle-zod";
import * as z from "zod";

import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";

export const expenseStatusPatchRequestSchema = z.object({
    status: z.enum(["Expense Paid", "Expense Submitted"]),
});

const payrollIdSchema = createSelectSchema(payrollTable).pick({ id: true }).shape.id;

export const payrollSettleRequestSchema = z.object({
    payrollIds: z.array(payrollIdSchema),
});

const voucherDayFields = createSelectSchema(payrollVoucherTable, {
    restDays: z.number(),
    publicHolidays: z.number(),
}).pick({
    restDays: true,
    publicHolidays: true,
});

export const payrollVoucherDaysUpdateRequestSchema = z.object({
    voucherId: z.uuid(),
    restDays: voucherDayFields.shape.restDays,
    publicHolidays: voucherDayFields.shape.publicHolidays,
});

export const payrollVoucherPayRateUpdateRequestSchema = z
    .object({
        voucherId: z.uuid(),
        field: z.enum([
            "monthlyPay",
            "hourlyRate",
            "restDayRate",
            "minimumWorkingHours",
        ]),
        value: z.union([
            z
                .number()
                .finite()
                .refine((n) => n >= 0, { message: "Must be ≥ 0" }),
            z.null(),
        ]),
    })
    .refine(
        (data) => data.value !== null || data.field === "minimumWorkingHours",
        {
            message: "Value is required for this field",
            path: ["value"],
        },
    );

const minimumWorkingHoursField = createSelectSchema(employmentTable, {
    minimumWorkingHours: z.number(),
}).pick({ minimumWorkingHours: true }).shape.minimumWorkingHours;

export const workerMinimumHoursBatchRequestSchema = z.object({
    updates: z.array(
        z.object({
            workerId: z.uuid(),
            minimumWorkingHours: minimumWorkingHoursField,
        }),
    ),
});
