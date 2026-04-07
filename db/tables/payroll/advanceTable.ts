import {
    pgTable,
    uuid,
    timestamp,
    date,
    integer,
    text,
} from "drizzle-orm/pg-core";
import { advanceRequestTable } from "./advanceRequestTable";

export const advanceTable = pgTable("advance", {
    id: uuid().primaryKey().defaultRandom(),
    amount: integer("amount").notNull(),
    status: text("status", {
        enum: ["Loan", "Paid"] as const,
    })
        .notNull()
        .default("Loan"),
    repaymentDate: date("repayment_date"),

    advanceRequestId: uuid("advance_request_id")
        .notNull()
        .references(() => advanceRequestTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectAdvance = typeof advanceTable.$inferSelect;
export type InsertAdvance = typeof advanceTable.$inferInsert;
