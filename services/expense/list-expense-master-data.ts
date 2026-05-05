import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { expenseCategoryTable } from "@/db/tables/expenseCategoryTable";
import { expenseSubcategoryTable } from "@/db/tables/expenseSubcategoryTable";
import type { SelectExpenseSupplier } from "@/db/tables/expenseSupplierTable";
import type { SelectExpenseCategory } from "@/db/tables/expenseCategoryTable";
import type { SelectExpenseSubcategory } from "@/db/tables/expenseSubcategoryTable";
import { expenseSupplierTable } from "@/db/tables/expenseSupplierTable";

export type ExpenseCategoryWithSubcategories = SelectExpenseCategory & {
    subcategories: SelectExpenseSubcategory[];
};

export async function listExpenseSuppliers(): Promise<SelectExpenseSupplier[]> {
    return db
        .select()
        .from(expenseSupplierTable)
        .orderBy(asc(expenseSupplierTable.name));
}

export async function listExpenseCategoriesWithSubcategories(): Promise<
    ExpenseCategoryWithSubcategories[]
> {
    const categories = await db
        .select()
        .from(expenseCategoryTable)
        .orderBy(asc(expenseCategoryTable.name));

    const subcategories = await db
        .select()
        .from(expenseSubcategoryTable)
        .orderBy(asc(expenseSubcategoryTable.name));

    const byCategory = new Map<string, typeof subcategories>();
    for (const s of subcategories) {
        const list = byCategory.get(s.categoryId) ?? [];
        list.push(s);
        byCategory.set(s.categoryId, list);
    }

    return categories.map((c) => ({
        ...c,
        subcategories: byCategory.get(c.id) ?? [],
    }));
}

export async function getExpenseCategoryById(id: string) {
    const [row] = await db
        .select()
        .from(expenseCategoryTable)
        .where(eq(expenseCategoryTable.id, id))
        .limit(1);
    return row ?? null;
}

export async function getExpenseSubcategoryById(id: string) {
    const [row] = await db
        .select()
        .from(expenseSubcategoryTable)
        .where(eq(expenseSubcategoryTable.id, id))
        .limit(1);
    return row ?? null;
}
