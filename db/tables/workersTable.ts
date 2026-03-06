import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const workersTable = pgTable("workers", {
    id: uuid().primaryKey().defaultRandom(),

    // Identity & contact
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),

    // Status & demographics
    status: text("status").notNull(),
    countryOfOrigin: text("country_of_origin"),
    race: text("race"),

    // Pay details (only one of monthlyPay / hourlyPay is typically set)
    monthlyPay: integer("monthly_pay"),
    hourlyPay: integer("hourly_pay"),
    paymentMethod: text("payment_method", {
        enum: ["PayNow", "Bank Transfer", "Cash"] as const,
    }),
    payNowPhone: text("paynow_phone"),
    bankAccountNumber: text("bank_account_number"),

    // Employment type
    employmentType: text("employment_type", {
        enum: ["Full Time", "Part Time"] as const,
    }).notNull(),

    employmentArrangement: text("employment_arrangement", {
        enum: ["Foreign Worker", "Local Worker"] as const,
    }).notNull(),

    // Audit (your mock data stores ISO dates without timezones)
    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

export type SelectWorker = typeof workersTable.$inferSelect;
export type InsertWorker = typeof workersTable.$inferInsert;
