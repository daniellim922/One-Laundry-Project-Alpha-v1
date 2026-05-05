/** Drizzle-derived Zod via `drizzle-zod` — supplier payloads for expense master data API. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { expenseSupplierTable } from "@/db/tables/expenseSupplierTable";

export const expenseSupplierFormSchema = createInsertSchema(
    expenseSupplierTable,
    {
        name: z.string().trim().min(1, "Name is required"),
        gstRegNumber: z.string().trim().nullish(),
    },
).pick({
    name: true,
    gstRegNumber: true,
});

export type ExpenseSupplierFormValues = z.infer<
    typeof expenseSupplierFormSchema
>;
