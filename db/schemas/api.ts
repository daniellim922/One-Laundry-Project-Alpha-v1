/** HTTP request Zod schemas derived with `drizzle-zod`. Nullable/select columns are narrowed to required numbers where the API contract demands it. */
import { createSelectSchema } from "drizzle-zod";
import * as z from "zod";

import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";

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
