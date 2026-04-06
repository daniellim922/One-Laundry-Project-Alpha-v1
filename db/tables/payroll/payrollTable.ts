import {
    pgTable,
    uuid,
    timestamp,
    date,
} from "drizzle-orm/pg-core";
import { workerTable } from "./workerTable";
import { payrollVoucherTable } from "./payrollVoucherTable";
import { payrollStatusEnum } from "./statusEnums";

export const payrollTable = pgTable("payroll", {
    id: uuid().primaryKey().defaultRandom(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    payrollDate: date("payroll_date").notNull(),
    status: payrollStatusEnum("status").notNull().default("Draft"),

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
