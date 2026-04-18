/** Same `createInsertSchema` API as `drizzle-orm/zod` ([docs](https://orm.drizzle.team/docs/zod)); use `drizzle-zod` while `drizzle-orm@0.45` stable has no `zod` export. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    WORKER_PAYMENT_METHODS,
    WORKER_STATUSES,
} from "@/types/status";

function atMostTwoDecimalPlaces(n: number): boolean {
    if (!Number.isFinite(n)) return false;
    const scaled = n * 100;
    return Math.abs(Math.round(scaled) - scaled) < 1e-6;
}

function isWholeNumber(n: number): boolean {
    if (!Number.isFinite(n)) return false;
    return Math.abs(n - Math.round(n)) < 1e-9;
}

const workerFields = createInsertSchema(workerTable, {
    name: (schema) => schema.min(1, "Name is required"),
    status: z.enum(WORKER_STATUSES, {
        error: () => ({ message: "Invalid worker status" }),
    }),
}).pick({
    name: true,
    nric: true,
    email: true,
    phone: true,
    status: true,
    countryOfOrigin: true,
    race: true,
});

const employmentFields = createInsertSchema(employmentTable, {
    employmentType: z.enum(WORKER_EMPLOYMENT_TYPES),
    employmentArrangement: z.enum(WORKER_EMPLOYMENT_ARRANGEMENTS),
    paymentMethod: z.enum(WORKER_PAYMENT_METHODS).nullable().optional(),
}).pick({
    employmentType: true,
    employmentArrangement: true,
    cpf: true,
    monthlyPay: true,
    hourlyRate: true,
    restDayRate: true,
    minimumWorkingHours: true,
    paymentMethod: true,
    payNowPhone: true,
    bankAccountNumber: true,
});

export const workerUpsertSchema = workerFields
    .extend(employmentFields.shape)
    .superRefine((values, ctx) => {
        const isFullTime = values.employmentType === "Full Time";
        const isPartTime = values.employmentType === "Part Time";
        const isBankTransfer = values.paymentMethod === "Bank Transfer";
        const isPayNow = values.paymentMethod === "PayNow";

        const emailRaw =
            typeof values.email === "string" ? values.email.trim() : "";
        if (emailRaw) {
            const parsed = z
                .email({ error: "Enter a valid email address" })
                .safeParse(emailRaw);
            if (!parsed.success) {
                ctx.addIssue({
                    code: "custom",
                    path: ["email"],
                    message: "Enter a valid email address",
                });
            }
        }

        if (values.employmentArrangement === "Local Worker") {
            const cpfVal = values.cpf;
            if (cpfVal != null && Number.isFinite(cpfVal)) {
                if (cpfVal < 0 || !atMostTwoDecimalPlaces(cpfVal)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["cpf"],
                        message:
                            "CPF must use at most two decimal places and cannot be negative",
                    });
                }
            }
        }

        if (isFullTime) {
            const payFields: Array<{
                key:
                    | "monthlyPay"
                    | "hourlyRate"
                    | "restDayRate"
                    | "minimumWorkingHours";
                requiredMessage: string;
                validationMessage: string;
                allowZero?: boolean;
                maxTwoDecimals?: boolean;
                wholeNumber?: boolean;
            }> = [
                {
                    key: "monthlyPay",
                    requiredMessage:
                        "Monthly pay is required for full time workers",
                    validationMessage: "Monthly pay must be a positive number",
                    maxTwoDecimals: true,
                },
                {
                    key: "hourlyRate",
                    requiredMessage:
                        "Hourly rate is required for full time workers",
                    validationMessage: "Hourly rate must be a positive number",
                    maxTwoDecimals: true,
                },
                {
                    key: "restDayRate",
                    requiredMessage:
                        "Rest day rate is required for full time workers",
                    validationMessage:
                        "Rest day rate must be a positive number",
                    maxTwoDecimals: true,
                },
                {
                    key: "minimumWorkingHours",
                    requiredMessage:
                        "Minimum working hours are required for full time workers",
                    validationMessage:
                        "Minimum working hours must be zero or a positive whole number",
                    allowZero: true,
                    wholeNumber: true,
                },
            ];

            for (const field of payFields) {
                const v = values[field.key];
                if (v == null || Number.isNaN(v)) {
                    ctx.addIssue({
                        code: "custom",
                        path: [field.key],
                        message: field.requiredMessage,
                    });
                    continue;
                }

                if (field.wholeNumber && !isWholeNumber(v)) {
                    ctx.addIssue({
                        code: "custom",
                        path: [field.key],
                        message:
                            "Minimum working hours must be a whole number with no decimals",
                    });
                    continue;
                }

                if (field.maxTwoDecimals && !atMostTwoDecimalPlaces(v)) {
                    const maxDecLabel =
                        field.key === "monthlyPay"
                            ? "Monthly pay"
                            : field.key === "hourlyRate"
                              ? "Hourly rate"
                              : "Rest day rate";
                    ctx.addIssue({
                        code: "custom",
                        path: [field.key],
                        message: `${maxDecLabel} must use at most two decimal places`,
                    });
                    continue;
                }

                const isValidNumber = field.allowZero ? v >= 0 : v > 0;
                if (!isValidNumber) {
                    ctx.addIssue({
                        code: "custom",
                        path: [field.key],
                        message: field.validationMessage,
                    });
                }
            }
        }

        if (isPartTime) {
            const v = values.hourlyRate;
            if (v == null || Number.isNaN(v)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["hourlyRate"],
                    message: "Hourly rate is required for part time workers",
                });
            } else if (!atMostTwoDecimalPlaces(v)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["hourlyRate"],
                    message: "Hourly rate must use at most two decimal places",
                });
            } else if (v <= 0) {
                ctx.addIssue({
                    code: "custom",
                    path: ["hourlyRate"],
                    message: "Hourly rate must be a positive number",
                });
            }
        }

        if (isBankTransfer) {
            const account =
                typeof values.bankAccountNumber === "string"
                    ? values.bankAccountNumber.trim()
                    : "";

            if (!account) {
                ctx.addIssue({
                    code: "custom",
                    path: ["bankAccountNumber"],
                    message:
                        "Bank account number is required for bank transfer",
                });
            }
        }

        if (isPayNow) {
            const rawPayNow = values.payNowPhone;
            const payNow =
                typeof rawPayNow === "string" ? rawPayNow.trim() : "";

            if (!payNow) {
                ctx.addIssue({
                    code: "custom",
                    path: ["payNowPhone"],
                    message:
                        "PayNow number is required when payment method is PayNow",
                });
            }
        }
    });

export type WorkerUpsertValues = z.infer<typeof workerUpsertSchema>;

export function formatWorkerUpsertZodError(error: z.ZodError): string {
    const first = error.issues[0];
    return first?.message ?? "Invalid input";
}
