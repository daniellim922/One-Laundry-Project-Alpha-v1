import * as z from "zod";

export const adhocLineItemSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    amount: z
        .number()
        .finite()
        .refine((value) => value !== 0, { message: "Amount must be non-zero" }),
});

export const adhocLineItemsSchema = z.array(adhocLineItemSchema);
