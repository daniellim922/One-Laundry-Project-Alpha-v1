/** Drizzle-derived Zod via `drizzle-zod` — category and subcategory payloads for API / management forms. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { expenseCategoryTable } from "@/db/tables/expenseCategoryTable";
import { expenseSubcategoryTable } from "@/db/tables/expenseSubcategoryTable";

export const expenseCategoryFormSchema = createInsertSchema(
    expenseCategoryTable,
    {
        name: z.string().trim().min(1, "Name is required"),
    },
).pick({
    name: true,
});

export const expenseSubcategoryFormSchema = createInsertSchema(
    expenseSubcategoryTable,
    {
        categoryId: z.uuid("Category is required"),
        name: z.string().trim().min(1, "Name is required"),
    },
).pick({
    categoryId: true,
    name: true,
});

export type ExpenseCategoryFormValues = z.infer<
    typeof expenseCategoryFormSchema
>;
export type ExpenseSubcategoryFormValues = z.infer<
    typeof expenseSubcategoryFormSchema
>;

export const expenseCategoryPatchSchema = expenseCategoryFormSchema
    .partial()
    .refine((d) => d.name !== undefined, {
        message: "At least one field must be provided",
    });

export const expenseSubcategoryPatchSchema = expenseSubcategoryFormSchema
    .partial()
    .refine((d) => d.categoryId !== undefined || d.name !== undefined, {
        message: "At least one of categoryId or name is required",
    });
