import {
    pgTable,
    uuid,
    timestamp,
    date,
    integer,
} from "drizzle-orm/pg-core";
import { advanceRequestTable } from "./advanceRequestTable";
import { loanPaidStatusEnum } from "./statusEnums";

export const advanceTable = pgTable("advance", {
    id: uuid().primaryKey().defaultRandom(),
    amount: integer("amount").notNull(),
    status: loanPaidStatusEnum("status").notNull().default("Loan"),
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
