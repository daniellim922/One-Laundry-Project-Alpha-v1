import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const expenseCategoryTable = pgTable("expense_category", {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectExpenseCategory = typeof expenseCategoryTable.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategoryTable.$inferInsert;
