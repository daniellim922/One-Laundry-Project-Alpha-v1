import {
    pgTable,
    uuid,
    timestamp,
    date,
    text,
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

    pdfStoragePath: text("pdf_storage_path"),

    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

// Drizzle's schema builder does not currently model PostgreSQL exclusion
// constraints, so `db/apply-custom-schema.ts` installs the worker-period overlap
// constraint after `drizzle-kit push`.

export type SelectPayroll = typeof payrollTable.$inferSelect;
export type InsertPayroll = typeof payrollTable.$inferInsert;
