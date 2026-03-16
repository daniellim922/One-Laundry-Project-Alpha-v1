import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { payrollTable } from "./payrollTable";
import { advanceTable } from "./advanceTable";

export const payrollTimesheetTable = pgTable("payroll_timesheet", {
    id: uuid().primaryKey().defaultRandom(),

    payrollId: uuid("payroll_id")
        .notNull()
        .references(() => payrollTable.id, { onDelete: "cascade" }),

    advanceId: uuid("advance_id")
        .notNull()
        .references(() => advanceTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectPayrollTimesheet = typeof payrollTimesheetTable.$inferSelect;
export type InsertPayrollTimesheet = typeof payrollTimesheetTable.$inferInsert;
