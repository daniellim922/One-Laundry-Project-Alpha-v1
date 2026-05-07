import { pgTable, uuid, text, timestamp, real } from "drizzle-orm/pg-core";

import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    WORKER_PAYMENT_METHODS,
    WORKER_SHIFT_PATTERNS,
} from "@/types/status";

export const employmentTable = pgTable("employment", {
    id: uuid().primaryKey().defaultRandom(),
    employmentType: text("employment_type", {
        enum: WORKER_EMPLOYMENT_TYPES,
    }).notNull(),
    employmentArrangement: text("employment_arrangement", {
        enum: WORKER_EMPLOYMENT_ARRANGEMENTS,
    }).notNull(),
    shiftPattern: text("shift_pattern", {
        enum: WORKER_SHIFT_PATTERNS,
    })
        .notNull()
        .default("Day Shift"),
    cpf: real("cpf"),
    monthlyPay: real("monthly_pay"),
    minimumWorkingHours: real("minimum_working_hours"),
    hourlyRate: real("hourly_rate"),
    restDayRate: real("rest_day_rate"),
    paymentMethod: text("payment_method", {
        enum: WORKER_PAYMENT_METHODS,
    }),
    payNowPhone: text("paynow_phone"),
    bankAccountNumber: text("bank_account_number"),

    // Audit (your mock data stores ISO dates without timezones)
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectEmployment = typeof employmentTable.$inferSelect;
export type InsertEmployment = typeof employmentTable.$inferInsert;
