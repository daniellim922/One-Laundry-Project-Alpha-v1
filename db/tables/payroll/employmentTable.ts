import { pgTable, uuid, text, timestamp, real } from "drizzle-orm/pg-core";

export const employmentTable = pgTable("employment", {
    id: uuid().primaryKey().defaultRandom(),
    employmentType: text("employment_type", {
        enum: ["Full Time", "Part Time"] as const,
    }).notNull(),
    employmentArrangement: text("employment_arrangement", {
        enum: ["Foreign Worker", "Local Worker"] as const,
    }).notNull(),
    cpf: real("cpf"),
    monthlyPay: real("monthly_pay"),
    minimumWorkingHours: real("minimum_working_hours"),
    hourlyRate: real("hourly_rate"),
    restDayRate: real("rest_day_rate"),
    paymentMethod: text("payment_method", {
        enum: ["PayNow", "Bank Transfer", "Cash"] as const,
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
