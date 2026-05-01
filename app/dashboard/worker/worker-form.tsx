"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Controller,
    useForm,
    useWatch,
    type Control,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

function RequiredMark() {
    return (
        <span className="text-destructive ml-0.5" aria-hidden="true">
            *
        </span>
    );
}
import {
    workerUpsertSchema,
    type WorkerUpsertFormInput,
    type WorkerUpsertValues,
} from "@/db/schemas/worker-employment";
import type { WorkerWithEmployment } from "@/db/tables/workerTable";
import { cn } from "@/lib/utils";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    WORKER_PAYMENT_METHODS,
} from "@/types/status";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import { createWorker, updateWorker } from "./actions";

function optionalNumberString(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return "";
    return String(n);
}

function bindTextNumericField(field: {
    value: unknown;
    onChange: (v: string) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
}) {
    const str =
        field.value == null || field.value === ""
            ? ""
            : String(field.value);
    return {
        name: field.name,
        ref: field.ref,
        onBlur: field.onBlur,
        value: str,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            field.onChange(e.target.value);
        },
    };
}

function NumericControllerField<T extends FieldValues>({
    control,
    name,
    formId,
    label,
    icon: Icon,
    required = false,
    inputMode = "decimal",
    visible = true,
    disabled = false,
}: {
    control: Control<T>;
    name: FieldPath<T>;
    formId: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    required?: boolean;
    inputMode?: "decimal" | "numeric";
    visible?: boolean;
    disabled?: boolean;
}) {
    if (!visible) return null;

    const id = `${formId}-${String(name)}`;

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <Field
                    data-invalid={fieldState.invalid}
                    className="space-y-2">
                    <FieldLabel htmlFor={id}>
                        {label}
                        {required ? <RequiredMark /> : null}
                    </FieldLabel>
                    <InputGroup>
                        <InputGroupInput
                            {...bindTextNumericField(field)}
                            id={id}
                            type="text"
                            inputMode={inputMode}
                            aria-invalid={fieldState.invalid}
                            aria-required={required ? true : undefined}
                            disabled={disabled}
                        />
                        <InputGroupAddon>
                            <Icon className="size-4 text-muted-foreground" />
                        </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
        />
    );
}

type WorkerFormValues = WorkerUpsertFormInput;

function getDefaultValues(
    worker?: WorkerWithEmployment | null,
): WorkerFormValues {
    return {
        name: worker?.name ?? "",
        nric: worker?.nric ?? "",
        email: worker?.email ?? "",
        phone: worker?.phone ?? "",
        status: (worker?.status ?? "Active") as WorkerFormValues["status"],
        employmentType: (worker?.employmentType ??
            "Full Time") as WorkerFormValues["employmentType"],
        employmentArrangement: (worker?.employmentArrangement ??
            "Local Worker") as WorkerFormValues["employmentArrangement"],
        countryOfOrigin: worker?.countryOfOrigin ?? "",
        race: worker?.race ?? "",
        cpf: optionalNumberString(worker?.cpf ?? undefined),
        monthlyPay: optionalNumberString(worker?.monthlyPay ?? undefined),
        hourlyRate: optionalNumberString(worker?.hourlyRate ?? undefined),
        restDayRate: optionalNumberString(worker?.restDayRate ?? undefined),
        minimumWorkingHours: optionalNumberString(
            worker?.minimumWorkingHours ?? undefined,
        ),
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

    const form = useForm<WorkerFormValues, undefined, WorkerUpsertValues>({
        resolver: zodResolver(workerUpsertSchema),
        defaultValues: getDefaultValues(worker),
        mode: "onTouched",
    });

    const watchedValues = useWatch({ control: form.control });
    const isFormValid =
        watchedValues === undefined
            ? false
            : workerUpsertSchema.safeParse(watchedValues).success;

    const onSubmit = async (data: WorkerUpsertValues) => {
        if (disabled) return;

        setError(null);
        setPending(true);

        let result;
        if (!worker) {
            result = await createWorker(data);
        } else {
            result = await updateWorker(worker.id, data);
        }

        setPending(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        router.push("/dashboard/worker/all");
        router.refresh();
    };

    const formId = "worker-form";

    const employmentType = form.watch("employmentType");
    const employmentArrangement = form.watch("employmentArrangement");
    const paymentMethod = form.watch("paymentMethod");

    const isFullTime = employmentType === "Full Time";

    return (
        <Card>
            <CardHeader>
                {!isCreate && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <CardDescription className="space-y-1 text-sm">
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>ID: {worker.id}</span>
                                {worker.nric ? (
                                    <span>NRIC: {worker.nric}</span>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>
                                    Created:{" "}
                                    {formatEnGbDmyNumericFromCalendar(
                                        worker.createdAt,
                                    )}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>
                                    Updated:{" "}
                                    {formatEnGbDmyNumericFromCalendar(
                                        worker.updatedAt,
                                    )}
                                </span>
                            </div>
                        </CardDescription>

                        <Controller
                            name="status"
                            control={form.control}
                            render={({ field }) => (
                                <div className="w-full sm:w-auto">
                                    <div
                                        role="group"
                                        aria-label="Status"
                                        className="flex gap-2 sm:justify-end">
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
                                                "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors sm:flex-none",
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
                                                field.value === "Inactive"
                                            }
                                            onClick={() =>
                                                field.onChange("Inactive")
                                            }
                                            className={cn(
                                                "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors sm:flex-none",
                                                field.value === "Inactive"
                                                    ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/50"
                                                    : "border-input bg-muted/50 text-muted-foreground hover:border-red-300 hover:bg-red-50/50 dark:hover:border-red-500/30 dark:hover:bg-red-500/10",
                                                disabled &&
                                                    "cursor-not-allowed opacity-50",
                                            )}>
                                            Inactive
                                        </button>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
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
                                isCreate ? "md:grid-cols-2" : "md:grid-cols-2",
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
                                            <RequiredMark />
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-name`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                aria-required
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
                            <Controller
                                name="nric"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-nric`}>
                                            NRIC
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                value={field.value ?? ""}
                                                id={`${formId}-nric`}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                disabled={disabled}
                                            />
                                            <InputGroupAddon>
                                                <UserCircle2 className="size-4 text-muted-foreground" />
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
                                                value={field.value ?? ""}
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
                                                value={field.value ?? ""}
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
                                                value={field.value ?? ""}
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
                                                value={field.value ?? ""}
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

                        <div className="grid gap-4 md:grid-cols-5">
                            <NumericControllerField
                                control={form.control}
                                name="monthlyPay"
                                formId={formId}
                                label="Monthly Pay"
                                icon={Banknote}
                                required
                                inputMode="decimal"
                                visible={isFullTime}
                                disabled={disabled}
                            />
                            <NumericControllerField
                                control={form.control}
                                name="hourlyRate"
                                formId={formId}
                                label="Hourly Rate"
                                icon={Banknote}
                                required
                                inputMode="decimal"
                                disabled={disabled}
                            />
                            <NumericControllerField
                                control={form.control}
                                name="restDayRate"
                                formId={formId}
                                label="Rest Day Rate"
                                icon={Banknote}
                                required
                                inputMode="decimal"
                                visible={isFullTime}
                                disabled={disabled}
                            />
                            <NumericControllerField
                                control={form.control}
                                name="minimumWorkingHours"
                                formId={formId}
                                label="Minimum Working Hours"
                                icon={Clock}
                                inputMode="numeric"
                                visible={isFullTime}
                                disabled={disabled}
                            />
                            <NumericControllerField
                                control={form.control}
                                name="cpf"
                                formId={formId}
                                label="CPF"
                                icon={Banknote}
                                inputMode="decimal"
                                visible={
                                    employmentArrangement === "Local Worker"
                                }
                                disabled={disabled}
                            />
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
                                                    const phoneTrimmed = String(
                                                        currentPhone ?? "",
                                                    ).trim();
                                                    if (
                                                        !currentPayNowPhone &&
                                                        phoneTrimmed
                                                    ) {
                                                        form.setValue(
                                                            "payNowPhone",
                                                            phoneTrimmed,
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
                                                PayNow
                                                <RequiredMark />
                                            </FieldLabel>
                                            <InputGroup>
                                                <InputGroupInput
                                                    {...field}
                                                    id={`${formId}-payNowPhone`}
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    autoComplete="tel"
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    aria-required
                                                    disabled={disabled}
                                                    onChange={(e) => {
                                                        field.onChange(
                                                            e.target.value.replace(
                                                                /\D/g,
                                                                "",
                                                            ),
                                                        );
                                                    }}
                                                    value={field.value ?? ""}
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
                                                <RequiredMark />
                                            </FieldLabel>
                                            <InputGroup>
                                                <InputGroupInput
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    id={`${formId}-bankAccountNumber`}
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    aria-required
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
                                <Button
                                    type="submit"
                                    disabled={pending || !isFormValid}>
                                    {pending
                                        ? isCreate
                                            ? "Adding..."
                                            : "Saving..."
                                        : isCreate
                                          ? "Add New Worker"
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
