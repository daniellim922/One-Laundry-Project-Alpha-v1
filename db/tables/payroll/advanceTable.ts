import {
    pgTable,
    uuid,
    timestamp,
    date,
    integer,
    text,
} from "drizzle-orm/pg-core";
import { workerTable } from "./workerTable";

export const advanceTable = pgTable("advance", {
    id: uuid().primaryKey().defaultRandom(),
    amount: integer("amount").notNull(),
    status: text("status", {
        enum: ["loan", "paid"] as const,
    })
        .notNull()
        .default("loan"),

    loanDate: date("loan_date").notNull().defaultNow(),
    repaymentDate: date("repayment_date").notNull(),

    workerId: uuid("worker_id")
        .notNull()
        .references(() => workerTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectAdvance = typeof advanceTable.$inferSelect;
export type InsertAdvance = typeof advanceTable.$inferInsert;
