/** Drizzle-derived Zod via `drizzle-zod` (same pattern as `worker-employment.ts`). Amounts are integers matching `integer()` columns; `amount` is the form alias for `amountRequested`. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";

const installmentRowSchema = createInsertSchema(advanceTable, {
    amount: z.number().int().positive().optional(),
    repaymentDate: z.string().optional(),
    status: z.enum(["Installment Loan", "Installment Paid"]).optional(),
}).pick({
    amount: true,
    repaymentDate: true,
    status: true,
});

const requestCore = createInsertSchema(advanceRequestTable, {
    workerId: z.string().min(1, "Select an employee"),
    requestDate: z
        .string()
        .min(1, "Date of request is required")
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    amountRequested: z
        .number({ error: () => ({ message: "Amount is required" }) })
        .int("Amount must be a positive integer")
        .positive("Amount must be a positive integer"),
    purpose: z.string().optional(),
}).pick({
    workerId: true,
    requestDate: true,
    amountRequested: true,
    purpose: true,
});

export const advanceRequestFormSchema = z
    .object({
        workerId: requestCore.shape.workerId,
        requestDate: requestCore.shape.requestDate,
        amount: requestCore.shape.amountRequested,
        purpose: requestCore.shape.purpose,
        installmentAmounts: z.array(installmentRowSchema),
    })
    .superRefine((values, ctx) => {
        const today = dateToLocalIsoYmd();
        let hasValidInstallment = false;
        const amountRequested = values.amount;
        const validInstallmentAmounts: number[] = [];

        values.installmentAmounts.forEach((row, i) => {
            const repaymentDate =
                typeof row.repaymentDate === "string"
                    ? row.repaymentDate.trim()
                    : "";
            const amountValue = row.amount;
            const hasRepaymentDate = repaymentDate.length > 0;
            const hasAmount =
                amountValue !== undefined && Number.isFinite(amountValue);
            const hasValidAmount =
                hasAmount &&
                Number.isInteger(amountValue) &&
                (amountValue as number) > 0;

            if (hasAmount && !hasRepaymentDate) {
                ctx.addIssue({
                    code: "custom",
                    path: ["installmentAmounts", i, "repaymentDate"],
                    message:
                        "Expected repayment date is required when amount is set",
                });
            }

            if (hasRepaymentDate && repaymentDate < values.requestDate) {
                ctx.addIssue({
                    code: "custom",
                    path: ["installmentAmounts", i, "repaymentDate"],
                    message:
                        "Expected repayment date must be on or after date of request",
                });
            }

            if (
                hasRepaymentDate &&
                row.status !== "Installment Paid" &&
                /^\d{4}-\d{2}-\d{2}$/.test(repaymentDate) &&
                repaymentDate < today
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["installmentAmounts", i, "repaymentDate"],
                    message: "Expected repayment date cannot be before today",
                });
            }

            if (hasRepaymentDate && /^\d{4}-\d{2}-\d{2}$/.test(repaymentDate)) {
                if (!hasValidAmount) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["installmentAmounts", i, "amount"],
                        message:
                            "Amount is required when repayment date is set",
                    });
                } else {
                    hasValidInstallment = true;
                    validInstallmentAmounts.push(amountValue as number);

                    if (
                        Number.isInteger(amountRequested) &&
                        amountRequested > 0 &&
                        (amountValue as number) > amountRequested
                    ) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["installmentAmounts", i, "amount"],
                            message: `Installment amount cannot exceed amount requested ($${amountRequested})`,
                        });
                    }
                }
            }
        });

        if (!hasValidInstallment) {
            ctx.addIssue({
                code: "custom",
                path: ["installmentAmounts"],
                message:
                    "At least one installment with amount and repayment date is required",
            });
        } else if (Number.isInteger(amountRequested) && amountRequested > 0) {
            const totalInstallments = validInstallmentAmounts.reduce(
                (sum, a) => sum + a,
                0,
            );
            if (totalInstallments !== amountRequested) {
                ctx.addIssue({
                    code: "custom",
                    path: ["installmentAmounts"],
                    message: `Total of installments ($${totalInstallments}) must equal amount requested ($${amountRequested})`,
                });
            }
        }
    });

export type AdvanceRequestFormValues = z.infer<typeof advanceRequestFormSchema>;
