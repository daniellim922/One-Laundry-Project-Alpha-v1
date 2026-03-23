import {
    pgTable,
    uuid,
    timestamp,
    date,
    integer,
    text,
} from "drizzle-orm/pg-core";
import { workerTable } from "./workerTable";

export const advanceRequestTable = pgTable("advance_request", {
    id: uuid().primaryKey().defaultRandom(),
    workerId: uuid("worker_id")
        .notNull()
        .references(() => workerTable.id, { onDelete: "cascade" }),
    status: text("status", {
        enum: ["loan", "paid"] as const,
    })
        .notNull()
        .default("loan"),
    requestDate: date("request_date").notNull(),
    amountRequested: integer("amount_requested").notNull(),
    purpose: text("purpose"),

    employeeSignature: text("employee_signature"),
    employeeSignatureDate: date("employee_signature_date"),
    managerSignature: text("manager_signature"),
    managerSignatureDate: date("manager_signature_date"),

    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectAdvanceRequest = typeof advanceRequestTable.$inferSelect;
export type InsertAdvanceRequest = typeof advanceRequestTable.$inferInsert;
