"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Banknote,
    Briefcase,
    Building2,
    Clock,
    CreditCard,
    Globe,
    Mail,
    Phone,
    User,
    UserCircle2,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { createWorker, updateWorker } from "./actions";

const workerFormSchema = z
    .object({
        name: z.string().min(1, "Name is required"),
        email: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(["Active", "Inactive"]),
        employmentType: z.enum(["Full Time", "Part Time"]),
        employmentArrangement: z.enum(["Foreign Worker", "Local Worker"]),
        countryOfOrigin: z.string().optional(),
        race: z.string().optional(),
        monthlyPay: z.string().optional(),
        hourlyPay: z.string().optional(),
        restDayPay: z.string().optional(),
        minimumWorkingHours: z.string().optional(),
        paymentMethod: z
            .enum(["PayNow", "Bank Transfer", "Cash"])
            .nullable()
            .optional(),
        payNowPhone: z.string().optional(),
        bankAccountNumber: z.string().optional(),
    })
    .superRefine((values, ctx) => {
        const isFullTime = values.employmentType === "Full Time";
        const isPartTime = values.employmentType === "Part Time";
        const isBankTransfer = values.paymentMethod === "Bank Transfer";
        const isPayNow = values.paymentMethod === "PayNow";

        if (isFullTime) {
            const payFields: Array<{
                key: "monthlyPay" | "hourlyPay" | "restDayPay" | "minimumWorkingHours";
                requiredMessage: string;
                positiveMessage: string;
            }> = [
                {
                    key: "monthlyPay",
                    requiredMessage:
                        "Monthly pay is required for full time workers",
                    positiveMessage:
                        "Monthly pay must be a positive number",
                },
                {
                    key: "hourlyPay",
                    requiredMessage:
                        "Hourly pay is required for full time workers",
                    positiveMessage:
                        "Hourly pay must be a positive number",
                },
                {
                    key: "restDayPay",
                    requiredMessage:
                        "Rest day pay is required for full time workers",
                    positiveMessage:
                        "Rest day pay must be a positive number",
                },
                {
                    key: "minimumWorkingHours",
                    requiredMessage:
                        "Minimum working hours are required for full time workers",
                    positiveMessage:
                        "Minimum working hours must be a positive number",
                },
            ];

            for (const field of payFields) {
                const rawValue = values[field.key];
                const value = typeof rawValue === "string" ? rawValue.trim() : "";

                if (!value) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [field.key],
                        message: field.requiredMessage,
                    });
                    continue;
                }

                const numericValue = Number(value);
                if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [field.key],
                        message: field.positiveMessage,
                    });
                }
            }
        }

        if (isPartTime) {
            const rawValue = values.hourlyPay;
            const value = typeof rawValue === "string" ? rawValue.trim() : "";

            if (!value) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["hourlyPay"],
                    message:
                        "Hourly pay is required for part time workers",
                });
            } else {
                const numericValue = Number(value);
                if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["hourlyPay"],
                        message:
                            "Hourly pay must be a positive number",
                    });
                }
            }
        }

        if (isBankTransfer) {
            const account =
                typeof values.bankAccountNumber === "string"
                    ? values.bankAccountNumber.trim()
                    : "";

            if (!account) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["bankAccountNumber"],
                    message:
                        "Bank account number is required for bank transfer",
                });
            }
        }

        if (isPayNow) {
            const rawPhone = values.payNowPhone;
            const phone =
                typeof rawPhone === "string" ? rawPhone.trim() : "";

            if (!phone) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["payNowPhone"],
                    message: "PayNow phone is required when PayNow is selected",
                });
            }
        }
    });

type WorkerFormValues = z.infer<typeof workerFormSchema>;

export type WorkerWithEmployment = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    countryOfOrigin: string | null;
    race: string | null;
    employmentType: string;
    employmentArrangement: string;
    monthlyPay: number | null;
    hourlyPay: number | null;
    restDayPay: number | null;
    minimumWorkingHours?: number | null;
    paymentMethod: string | null;
    payNowPhone: string | null;
    bankAccountNumber: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
};

function getDefaultValues(
    worker?: WorkerWithEmployment | null,
): WorkerFormValues {
    return {
        name: worker?.name ?? "",
        email: worker?.email ?? "",
        phone: worker?.phone ?? "",
        status: (worker?.status === "On Leave"
            ? "Active"
            : (worker?.status ?? "Active")) as WorkerFormValues["status"],
        employmentType: (worker?.employmentType ??
            "Full Time") as WorkerFormValues["employmentType"],
        employmentArrangement: (worker?.employmentArrangement ??
            "Local Worker") as WorkerFormValues["employmentArrangement"],
        countryOfOrigin: worker?.countryOfOrigin ?? "",
        race: worker?.race ?? "",
        monthlyPay: worker?.monthlyPay?.toString() ?? "",
        hourlyPay: worker?.hourlyPay?.toString() ?? "",
        restDayPay: worker?.restDayPay?.toString() ?? "",
        minimumWorkingHours: worker?.minimumWorkingHours?.toString() ?? "",
        paymentMethod: (worker?.paymentMethod ??
            "Cash") as WorkerFormValues["paymentMethod"],
        payNowPhone: worker?.payNowPhone ?? "",
        bankAccountNumber: worker?.bankAccountNumber ?? "",
    };
}

interface WorkerFormProps {
    worker?: WorkerWithEmployment | null;
    /** When true, all fields are read-only (view mode) */
    disabled?: boolean;
}

export function WorkerForm({ worker, disabled = false }: WorkerFormProps) {
    const isCreate = !worker;

    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const form = useForm<WorkerFormValues>({
        resolver: zodResolver(workerFormSchema),
        defaultValues: getDefaultValues(worker),
    });

    const onSubmit = async (data: WorkerFormValues) => {
        if (disabled) return;

        setError(null);
        setPending(true);

        const formData = new FormData();
        for (const [key, value] of Object.entries(data)) {
            if (value === undefined || value === null) continue;
            formData.set(key, String(value));
        }

        let result;
        if (!worker) {
            result = await createWorker(formData);
        } else {
            result = await updateWorker(worker.id, formData);
        }

        setPending(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        router.push("/dashboard/workers");
        router.refresh();
    };

    const formId = "worker-form";

    const employmentType = form.watch("employmentType");
    const paymentMethod = form.watch("paymentMethod");

    return (
        <Card>
            <CardHeader>
                {isCreate ? (
                    <CardDescription>
                        Fill in the details for the new worker.
                    </CardDescription>
                ) : (
                    <CardDescription className="space-y-1 text-sm">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>ID: {worker.id}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>
                                Created:{" "}
                                {new Date(worker.createdAt).toLocaleDateString(
                                    "en-CA",
                                    {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                    },
                                )}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>
                                Updated:{" "}
                                {new Date(worker.updatedAt).toLocaleDateString(
                                    "en-CA",
                                    {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                    },
                                )}
                            </span>
                        </div>
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <form
                    id={formId}
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                    autoComplete="off">
                    <FieldGroup className="space-y-6">
                        <div
                            className={cn(
                                "grid gap-4",
                                isCreate ? "md:grid-cols-1" : "md:grid-cols-2",
                            )}>
                            <Controller
                                name="name"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-name`}>
                                            Name
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-name`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <User className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            {!isCreate && (
                                <Controller
                                    name="status"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            className="space-y-2">
                                            <FieldLabel>
                                                <span className="flex items-center gap-2">
                                                    <UserCircle2 className="size-4" />
                                                    Status
                                                </span>
                                            </FieldLabel>
                                            <div
                                                role="group"
                                                aria-label="Status"
                                                className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={disabled}
                                                    aria-pressed={
                                                        field.value === "Active"
                                                    }
                                                    onClick={() =>
                                                        field.onChange("Active")
                                                    }
                                                    className={cn(
                                                        "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                                        field.value === "Active"
                                                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50"
                                                            : "border-input bg-muted/50 text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10",
                                                        disabled &&
                                                            "cursor-not-allowed opacity-50",
                                                    )}>
                                                    Active
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={disabled}
                                                    aria-pressed={
                                                        field.value ===
                                                        "Inactive"
                                                    }
                                                    onClick={() =>
                                                        field.onChange(
                                                            "Inactive",
                                                        )
                                                    }
                                                    className={cn(
                                                        "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                                        field.value ===
                                                            "Inactive"
                                                            ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/50"
                                                            : "border-input bg-muted/50 text-muted-foreground hover:border-red-300 hover:bg-red-50/50 dark:hover:border-red-500/30 dark:hover:bg-red-500/10",
                                                        disabled &&
                                                            "cursor-not-allowed opacity-50",
                                                    )}>
                                                    Inactive
                                                </button>
                                            </div>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="email"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-email`}>
                                            Email
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-email`}
                                                type="email"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <Mail className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="phone"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-phone`}>
                                            Phone
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-phone`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <Phone className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="countryOfOrigin"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel
                                            htmlFor={`${formId}-countryOfOrigin`}>
                                            Country of Origin
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-countryOfOrigin`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <Globe className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="race"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-race`}>
                                            Race
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-race`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <Users className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="employmentType"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel>
                                            <span className="flex items-center gap-2">
                                                <Briefcase className="size-4" />
                                                Employment Type
                                            </span>
                                        </FieldLabel>
                                        <div
                                            role="group"
                                            aria-label="Employment type"
                                            className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                aria-pressed={
                                                    field.value === "Full Time"
                                                }
                                                onClick={() =>
                                                    field.onChange("Full Time")
                                                }
                                                className={cn(
                                                    "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                                    field.value === "Full Time"
                                                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50"
                                                        : "border-input bg-muted/50 text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10",
                                                    disabled &&
                                                        "cursor-not-allowed opacity-50",
                                                )}>
                                                Full Time
                                            </button>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                aria-pressed={
                                                    field.value === "Part Time"
                                                }
                                                onClick={() =>
                                                    field.onChange("Part Time")
                                                }
                                                className={cn(
                                                    "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                                    field.value === "Part Time"
                                                        ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/50"
                                                        : "border-input bg-muted/50 text-muted-foreground hover:border-sky-300 hover:bg-sky-50/50 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/10",
                                                    disabled &&
                                                        "cursor-not-allowed opacity-50",
                                                )}>
                                                Part Time
                                            </button>
                                        </div>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="employmentArrangement"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel>
                                            <span className="flex items-center gap-2">
                                                <Users className="size-4" />
                                                Employment Arrangement
                                            </span>
                                        </FieldLabel>
                                        <div
                                            role="group"
                                            aria-label="Employment arrangement"
                                            className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                aria-pressed={
                                                    field.value ===
                                                    "Foreign Worker"
                                                }
                                                onClick={() =>
                                                    field.onChange(
                                                        "Foreign Worker",
                                                    )
                                                }
                                                className={cn(
                                                    "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                                    field.value ===
                                                        "Foreign Worker"
                                                        ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/50"
                                                        : "border-input bg-muted/50 text-muted-foreground hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10",
                                                    disabled &&
                                                        "cursor-not-allowed opacity-50",
                                                )}>
                                                Foreign Worker
                                            </button>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                aria-pressed={
                                                    field.value ===
                                                    "Local Worker"
                                                }
                                                onClick={() =>
                                                    field.onChange(
                                                        "Local Worker",
                                                    )
                                                }
                                                className={cn(
                                                    "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                                    field.value ===
                                                        "Local Worker"
                                                        ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/50"
                                                        : "border-input bg-muted/50 text-muted-foreground hover:border-amber-300 hover:bg-amber-50/50 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10",
                                                    disabled &&
                                                        "cursor-not-allowed opacity-50",
                                                )}>
                                                Local Worker
                                            </button>
                                        </div>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            {employmentType === "Full Time" && (
                                <Controller
                                    name="monthlyPay"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            className="space-y-2">
                                            <FieldLabel
                                                htmlFor={`${formId}-monthlyPay`}>
                                                Monthly Pay
                                            </FieldLabel>
                                            <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-monthlyPay`}
                                                type="number"
                                                min={0}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                                <InputGroupAddon>
                                                    <Banknote className="size-4 text-muted-foreground" />
                                                </InputGroupAddon>
                                            </InputGroup>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}
                            <Controller
                                name="hourlyPay"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel
                                            htmlFor={`${formId}-hourlyPay`}>
                                            Hourly Pay
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-hourlyPay`}
                                                type="number"
                                                min={0}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <Banknote className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            {employmentType === "Full Time" && (
                                <Controller
                                    name="restDayPay"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            className="space-y-2">
                                            <FieldLabel
                                                htmlFor={`${formId}-restDayPay`}>
                                                Rest Day Pay
                                            </FieldLabel>
                                            <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-restDayPay`}
                                                type="number"
                                                min={0}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                                <InputGroupAddon>
                                                    <Banknote className="size-4 text-muted-foreground" />
                                                </InputGroupAddon>
                                            </InputGroup>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}
                            {employmentType === "Full Time" && (
                                <Controller
                                    name="minimumWorkingHours"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            className="space-y-2">
                                            <FieldLabel
                                                htmlFor={`${formId}-minimumWorkingHours`}>
                                                Minimum Working Hours
                                            </FieldLabel>
                                            <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-minimumWorkingHours`}
                                                type="number"
                                                min={0}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                                <InputGroupAddon>
                                                    <Clock className="size-4 text-muted-foreground" />
                                                </InputGroupAddon>
                                            </InputGroup>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="paymentMethod"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel
                                            htmlFor={`${formId}-paymentMethod`}>
                                            <span className="flex items-center gap-2">
                                                <CreditCard className="size-4" />
                                                Payment Method
                                            </span>
                                        </FieldLabel>
                                        <Select
                                            value={field.value ?? undefined}
                                            onValueChange={(val) => {
                                                const method =
                                                    val as WorkerFormValues["paymentMethod"];
                                                field.onChange(method);

                                                if (method === "PayNow") {
                                                    const currentPhone =
                                                        form.getValues("phone");
                                                    const currentPayNowPhone =
                                                        form.getValues(
                                                            "payNowPhone",
                                                        );
                                                    if (
                                                        !currentPayNowPhone &&
                                                        currentPhone
                                                    ) {
                                                        form.setValue(
                                                            "payNowPhone",
                                                            currentPhone,
                                                            {
                                                                shouldDirty: true,
                                                            },
                                                        );
                                                    }
                                                }

                                                if (method === "Cash") {
                                                    form.setValue(
                                                        "payNowPhone",
                                                        "",
                                                    );
                                                    form.setValue(
                                                        "bankAccountNumber",
                                                        "",
                                                    );
                                                }
                                            }}
                                            disabled={disabled}>
                                            <SelectTrigger
                                                id={`${formId}-paymentMethod`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PayNow">
                                                    PayNow
                                                </SelectItem>
                                                <SelectItem value="Bank Transfer">
                                                    Bank Transfer
                                                </SelectItem>
                                                <SelectItem value="Cash">
                                                    Cash
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            {paymentMethod === "PayNow" && (
                                <Controller
                                    name="payNowPhone"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            className="space-y-2">
                                            <FieldLabel
                                                htmlFor={`${formId}-payNowPhone`}>
                                                PayNow Phone
                                            </FieldLabel>
                                            <InputGroup>
                                                <InputGroupInput
                                                    {...field}
                                                    id={`${formId}-payNowPhone`}
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    disabled={disabled}
                                                />
                                                <InputGroupAddon>
                                                    <Phone className="size-4 text-muted-foreground" />
                                                </InputGroupAddon>
                                            </InputGroup>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}
                            {paymentMethod === "Bank Transfer" && (
                                <Controller
                                    name="bankAccountNumber"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            className="space-y-2">
                                            <FieldLabel
                                                htmlFor={`${formId}-bankAccountNumber`}>
                                                Bank Account Number
                                            </FieldLabel>
                                            <InputGroup>
                                                <InputGroupInput
                                                    {...field}
                                                    id={`${formId}-bankAccountNumber`}
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    disabled={disabled}
                                                />
                                                <InputGroupAddon>
                                                    <Building2 className="size-4 text-muted-foreground" />
                                                </InputGroupAddon>
                                            </InputGroup>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}
                        </div>
                    </FieldGroup>

                    {!disabled && (
                        <div className="flex flex-col gap-2 pt-2">
                            {error && (
                                <p className="text-destructive text-sm">
                                    {error}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button type="submit" disabled={pending}>
                                    {pending
                                        ? isCreate
                                            ? "Adding..."
                                            : "Saving..."
                                        : isCreate
                                          ? "Add worker"
                                          : "Save changes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
