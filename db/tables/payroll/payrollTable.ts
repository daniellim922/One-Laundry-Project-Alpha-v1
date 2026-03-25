import {
    pgTable,
    uuid,
    text,
    timestamp,
    date,
} from "drizzle-orm/pg-core";
import { workerTable } from "./workerTable";
import { payrollVoucherTable } from "./payrollVoucherTable";

export const payrollTable = pgTable("payroll", {
    id: uuid().primaryKey().defaultRandom(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    payrollDate: date("payroll_date").notNull(),
    status: text("status", {
        enum: ["draft", "settled"] as const,
    })
        .notNull()
        .default("draft"),

    workerId: uuid("worker_id")
        .references(() => workerTable.id, { onDelete: "cascade" })
        .notNull(),

    payrollVoucherId: uuid("payroll_voucher_id")
        .references(() => payrollVoucherTable.id)
        .notNull(),

    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

export type SelectPayroll = typeof payrollTable.$inferSelect;
export type InsertPayroll = typeof payrollTable.$inferInsert;
