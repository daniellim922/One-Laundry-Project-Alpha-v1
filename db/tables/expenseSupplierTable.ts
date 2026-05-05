import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const expenseSupplierTable = pgTable("expense_supplier", {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
    gstRegNumber: text("gst_reg_number"),
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectExpenseSupplier = typeof expenseSupplierTable.$inferSelect;
export type InsertExpenseSupplier = typeof expenseSupplierTable.$inferInsert;
