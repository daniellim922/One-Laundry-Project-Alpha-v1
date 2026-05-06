import {
    date,
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import { expenseStatusEnum } from "./statusEnums";

export const expensesTable = pgTable("expenses", {
    id: uuid().primaryKey().defaultRandom(),
    categoryName: text("category_name").notNull(),
    subcategoryName: text("subcategory_name").notNull(),
    supplierName: text("supplier_name").notNull(),
    supplierGstRegNumber: text("supplier_gst_reg_number"),
    description: text("description"),
    invoiceNumber: text("invoice_number"),
    subtotalCents: integer("subtotal_cents").notNull(),
    gstCents: integer("gst_cents").notNull(),
    grandTotalCents: integer("grand_total_cents").notNull(),
    invoiceDate: date("invoice_date").notNull(),
    submissionDate: date("submission_date").notNull(),
    status: expenseStatusEnum("status").notNull().default("Expense Submitted"),
    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectExpense = typeof expensesTable.$inferSelect;
export type InsertExpense = typeof expensesTable.$inferInsert;
