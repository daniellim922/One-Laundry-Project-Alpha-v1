import { eq } from "drizzle-orm";

import {
    buildExpenseFormSchema,
    type ExpenseFormValues,
} from "@/db/schemas/expense";
import { expensesTable } from "@/db/tables/expensesTable";
import { db } from "@/lib/db";

import {
    listExpenseCategoriesWithSubcategories,
    listExpenseSuppliers,
} from "./list-expense-master-data";

function normalizeInsertable(
    data: ExpenseFormValues,
): typeof expensesTable.$inferInsert {
    return {
        categoryName: data.categoryName,
        subcategoryName: data.subcategoryName,
        supplierName: data.supplierName,
        description: data.description?.trim() || null,
        invoiceNumber: data.invoiceNumber?.trim() || null,
        supplierGstRegNumber: data.supplierGstRegNumber?.trim() || null,
        subtotalCents: data.subtotalCents,
        gstCents: data.gstCents,
        grandTotalCents: data.grandTotalCents,
        invoiceDate: data.invoiceDate,
        submissionDate: data.submissionDate,
        status: data.status,
    };
}

async function expenseSaveSchema() {
    const [categories, supplierRows] = await Promise.all([
        listExpenseCategoriesWithSubcategories(),
        listExpenseSuppliers(),
    ]);
    const supplierNames = supplierRows.map((s) => s.name);
    return buildExpenseFormSchema(categories, supplierNames);
}

export type SaveExpenseError =
    | { code: "VALIDATION"; details: unknown }
    | { code: "NOT_FOUND" };

export async function insertExpenseRecord(
    values: ExpenseFormValues,
): Promise<{ success: true; id: string } | { success: false; error: SaveExpenseError }> {
    const schema = await expenseSaveSchema();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
        return {
            success: false,
            error: { code: "VALIDATION", details: parsed.error.flatten() },
        };
    }

    const [row] = await db
        .insert(expensesTable)
        .values(normalizeInsertable(parsed.data))
        .returning({ id: expensesTable.id });

    if (!row) {
        return { success: false, error: { code: "NOT_FOUND" } };
    }

    return { success: true, id: row.id };
}

export async function updateExpenseRecord(
    id: string,
    values: ExpenseFormValues,
): Promise<{ success: true } | { success: false; error: SaveExpenseError }> {
    const schema = await expenseSaveSchema();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
        return {
            success: false,
            error: { code: "VALIDATION", details: parsed.error.flatten() },
        };
    }

    const updated = await db
        .update(expensesTable)
        .set({
            ...normalizeInsertable(parsed.data),
            updatedAt: new Date(),
        })
        .where(eq(expensesTable.id, id))
        .returning({ id: expensesTable.id });

    if (updated.length === 0) {
        return { success: false, error: { code: "NOT_FOUND" } };
    }

    return { success: true };
}
