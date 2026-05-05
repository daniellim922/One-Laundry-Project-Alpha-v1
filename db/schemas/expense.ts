/** Drizzle-derived Zod via `drizzle-zod` — expense create/update forms. Master-data alignment refines category/subcategory/supplier names at runtime with {@link buildExpenseFormSchema}. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { expensesTable } from "@/db/tables/expensesTable";

/** Singapore GST rate applied in the expenses UI for auto-calculated GST (9%). */
export const SGP_GST_RATE = 0.09;

const expenseStatuses = ["Expense Submitted", "Expense Paid"] as const;

const isoDate = (label: string) =>
    z
        .string()
        .min(1, `${label} is required`)
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

/** Shape stored on each expense row; pair with {@link buildExpenseFormSchema} for master-data guards. */
export const expenseFormFieldsSchema = createInsertSchema(expensesTable, {
    categoryName: z.string().trim().min(1, "Category is required"),
    subcategoryName: z.string().trim().min(1, "Subcategory is required"),
    supplierName: z.string().trim().min(1, "Supplier is required"),
    description: z.string().trim().nullish(),
    invoiceNumber: z.string().trim().nullish(),
    supplierGstRegNumber: z.string().trim().nullish(),
    subtotalCents: z
        .number({ error: () => ({ message: "Subtotal is required" }) })
        .int("Subtotal must be whole cents")
        .nonnegative("Subtotal cannot be negative"),
    gstCents: z
        .number({ error: () => ({ message: "GST is required" }) })
        .int("GST must be whole cents")
        .nonnegative("GST cannot be negative"),
    grandTotalCents: z
        .number({ error: () => ({ message: "Grand total is required" }) })
        .int("Grand total must be whole cents")
        .nonnegative("Grand total cannot be negative"),
    invoiceDate: isoDate("Invoice date"),
    submissionDate: isoDate("Submission date"),
    status: z.enum(expenseStatuses, {
        error: () => ({ message: "Invalid expense status" }),
    }),
}).pick({
    categoryName: true,
    subcategoryName: true,
    supplierName: true,
    description: true,
    invoiceNumber: true,
    supplierGstRegNumber: true,
    subtotalCents: true,
    gstCents: true,
    grandTotalCents: true,
    invoiceDate: true,
    submissionDate: true,
    status: true,
});

export type ExpenseFormValues = z.infer<typeof expenseFormFieldsSchema>;

export type BuildExpenseFormCategoryInput = Readonly<{
    name: string;
    subcategories: readonly { readonly name: string }[];
}>;

/**
 * Validates grand total arithmetic and resolves category / subcategory / supplier
 * selections against configured master-data rows (by name).
 */
export function buildExpenseFormSchema(
    categories: readonly BuildExpenseFormCategoryInput[],
    supplierNamesSorted: readonly string[],
) {
    const supplierNames = new Set(supplierNamesSorted);

    return expenseFormFieldsSchema.superRefine((data, ctx) => {
        if (data.grandTotalCents !== data.subtotalCents + data.gstCents) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["grandTotalCents"],
                message: "Grand total must equal subtotal plus GST (in cents)",
            });
        }

        const category = categories.find((c) => c.name === data.categoryName);
        if (!category) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["categoryName"],
                message: "Unknown expense category",
            });
            return;
        }

        const subOk = category.subcategories.some(
            (s) => s.name === data.subcategoryName,
        );
        if (!subOk) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["subcategoryName"],
                message:
                    "Subcategory is not defined for the selected category (or spelling differs)",
            });
        }

        if (!supplierNames.has(data.supplierName)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["supplierName"],
                message: "Unknown supplier name",
            });
        }
    });
}
