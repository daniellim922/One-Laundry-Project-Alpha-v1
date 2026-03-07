import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    real,
    date,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { workersTable } from "./workersTable";

export const payrollsTable = pgTable(
    "payrolls",
    {
        id: uuid().primaryKey().defaultRandom(),
        workerId: uuid("worker_id")
            .notNull()
            .references(() => workersTable.id, { onDelete: "cascade" }),
        periodStart: date("period_start").notNull(),
        periodEnd: date("period_end").notNull(),
        payrollDate: date("payroll_date").notNull(),
        totalHours: real("total_hours").notNull(),
        totalPay: integer("total_pay").notNull(),
        status: text("status", {
            enum: ["draft", "approved", "paid"] as const,
        })
            .notNull()
            .default("draft"),
        createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
    },
    (table) => [
        uniqueIndex("payrolls_worker_period_idx").on(table.workerId, table.periodStart),
    ],
);

export type SelectPayroll = typeof payrollsTable.$inferSelect;
export type InsertPayroll = typeof payrollsTable.$inferInsert;
