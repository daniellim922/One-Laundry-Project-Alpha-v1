import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const expensesTable = pgTable("expenses", {
    id: uuid().primaryKey().defaultRandom(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    category: text("category"),
    date: timestamp("date", { withTimezone: false }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

export type SelectExpense = typeof expensesTable.$inferSelect;
export type InsertExpense = typeof expensesTable.$inferInsert;
