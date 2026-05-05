import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { expenseCategoryTable } from "./expenseCategoryTable";

export const expenseSubcategoryTable = pgTable("expense_subcategory", {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
        .notNull()
        .references(() => expenseCategoryTable.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectExpenseSubcategory =
    typeof expenseSubcategoryTable.$inferSelect;
export type InsertExpenseSubcategory =
    typeof expenseSubcategoryTable.$inferInsert;
