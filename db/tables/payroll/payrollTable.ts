import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    real,
    date,
} from "drizzle-orm/pg-core";
import { workerTable } from "./workerTable";
import { employmentTable } from "./employmentTable";
import { advanceTable } from "./advanceTable";

export const payrollTable = pgTable("payroll", {
    id: uuid().primaryKey().defaultRandom(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    payrollDate: date("payroll_date").notNull(),
    totalHours: real("total_hours").notNull(),
    overtimeHours: real("overtime_hours").notNull(),
    restDays: integer("rest_days").notNull(),
    totalPay: integer("total_pay").notNull(),
    status: text("status", {
        enum: ["draft", "approved", "paid"] as const,
    })
        .notNull()
        .default("draft"),

    workerId: uuid("worker_id")
        .references(() => workerTable.id, { onDelete: "cascade" })
        .notNull(),
    employmentId: uuid("employment_id")
        .references(() => employmentTable.id, { onDelete: "cascade" })
        .notNull(),

    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

export type SelectPayroll = typeof payrollTable.$inferSelect;
export type InsertPayroll = typeof payrollTable.$inferInsert;
