/** Same `createInsertSchema` API as `drizzle-orm/zod` ([docs](https://orm.drizzle.team/docs/zod)); use `drizzle-zod` while `drizzle-orm@0.45` stable has no `zod` export. */
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    WORKER_PAYMENT_METHODS,
    WORKER_SHIFT_PATTERNS,
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
    shiftPattern: z.enum(WORKER_SHIFT_PATTERNS).default("Day Shift"),
}).pick({
    employmentType: true,
    employmentArrangement: true,
    shiftPattern: true,
    cpf: true,
    monthlyPay: true,
    hourlyRate: true,
    restDayRate: true,
    minimumWorkingHours: true,
    paymentMethod: true,
    payNowPhone: true,
    bankAccountNumber: true,
});

/** Text inputs for CPF, money, and hours fields: keep raw strings in the form, normalize to number | undefined before superRefine. */
const asOptionalNumberText = z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v): number | undefined => {
        if (v == null) return undefined;
        if (typeof v === "number") {
            return Number.isFinite(v) && !Number.isNaN(v) ? v : undefined;
        }
        const t = v.trim();
        if (t === "") return undefined;
        const n = Number(t);
        return Number.isNaN(n) ? undefined : n;
    });

/** Accept missing keys after Server Action / JSON serialization strips undefined-shaped fields. */
const optionalEmployNumericTextField = asOptionalNumberText.optional();

export const workerUpsertSchema = workerFields
    .extend({
        ...employmentFields.shape,
        cpf: optionalEmployNumericTextField,
        monthlyPay: optionalEmployNumericTextField,
        hourlyRate: optionalEmployNumericTextField,
        restDayRate: optionalEmployNumericTextField,
        minimumWorkingHours: optionalEmployNumericTextField,
    })
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
                key: "monthlyPay" | "hourlyRate" | "restDayRate";
                requiredMessage: string;
                validationMessage: string;
                maxTwoDecimals: boolean;
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

                if (v <= 0) {
                    ctx.addIssue({
                        code: "custom",
                        path: [field.key],
                        message: field.validationMessage,
                    });
                }
            }

            const mwh = values.minimumWorkingHours;
            if (mwh != null && !Number.isNaN(mwh)) {
                if (!isWholeNumber(mwh)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["minimumWorkingHours"],
                        message:
                            "Minimum working hours must be a whole number with no decimals",
                    });
                } else if (mwh < 0) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["minimumWorkingHours"],
                        message:
                            "Minimum working hours must be zero or a positive whole number",
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

export type WorkerUpsertFormInput = z.input<typeof workerUpsertSchema>;
export type WorkerUpsertValues = z.output<typeof workerUpsertSchema>;

export function formatWorkerUpsertZodError(error: z.ZodError): string {
    const first = error.issues[0];
    return first?.message ?? "Invalid input";
}
