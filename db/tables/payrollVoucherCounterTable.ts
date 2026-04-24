import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

export const payrollVoucherCounterTable = pgTable("payroll_voucher_counter", {
    year: integer("year").primaryKey(),
    currentValue: integer("current_value").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectPayrollVoucherCounter =
    typeof payrollVoucherCounterTable.$inferSelect;
export type InsertPayrollVoucherCounter =
    typeof payrollVoucherCounterTable.$inferInsert;
