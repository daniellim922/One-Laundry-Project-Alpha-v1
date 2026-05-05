import {
    date,
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import { expenseCategoryTable } from "./expenseCategoryTable";
import { expenseSubcategoryTable } from "./expenseSubcategoryTable";
import { expenseStatusEnum } from "./statusEnums";

export const expensesTable = pgTable("expenses", {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
        .notNull()
        .references(() => expenseCategoryTable.id, { onDelete: "restrict" }),
    subcategoryId: uuid("subcategory_id")
        .notNull()
        .references(() => expenseSubcategoryTable.id, {
            onDelete: "restrict",
        }),
    name: text("name").notNull(),
    description: text("description"),
    invoiceNumber: text("invoice_number"),
    supplierGstRegNumber: text("supplier_gst_reg_number"),
    subtotalCents: integer("subtotal_cents").notNull(),
    gstCents: integer("gst_cents").notNull(),
    grandTotalCents: integer("grand_total_cents").notNull(),
    invoiceDate: date("invoice_date").notNull(),
    submissionDate: date("submission_date").notNull(),
    status: expenseStatusEnum("status")
        .notNull()
        .default("Expense Submitted"),
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectExpense = typeof expensesTable.$inferSelect;
export type InsertExpense = typeof expensesTable.$inferInsert;
