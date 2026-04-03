"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Banknote,
    Calendar,
    DollarSign,
    Plus,
    Trash2,
    User,
} from "lucide-react";

import { createAdvanceRequest } from "@/app/dashboard/advance/new/actions";
import { updateAdvanceRequest } from "@/app/dashboard/advance/[id]/edit/actions";
import type { AdvanceRequestDetail } from "@/utils/advance/queries";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { Badge } from "@/components/ui/badge";
import { loanPaidToneClassName } from "@/types/badge-tones";
import { localDateDmy, localIsoDateYmd } from "@/utils/time/local-iso-date";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const formSchema = z
    .object({
        workerId: z.string().min(1, "Select an employee"),
        loanDate: z
            .string()
            .min(1, "Date of request is required")
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
        amount: z
            .string()
            .min(1, "Amount is required")
            .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
                message: "Amount must be a positive integer",
            }),
        purpose: z.string().optional(),
        installmentAmounts: z.array(
            z.object({
                amount: z.string().optional(),
                repaymentDate: z
                    .string()
                    .transform((v) => v.trim())
                    .refine(
                        (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
                        "Invalid date",
                    ),
                status: z.enum(["loan", "paid"]).optional(),
            }),
        ),
    })
    .superRefine((values, ctx) => {
        const today = localIsoDateYmd();
        let hasValidInstallment = false;
        const amountRequested = Number(values.amount);
        const validInstallmentAmounts: number[] = [];

        values.installmentAmounts.forEach((row, i) => {
            const repaymentDate = row.repaymentDate?.trim() ?? "";
            const amountRaw = row.amount?.trim() ?? "";
            const hasRepaymentDate = repaymentDate.length > 0;
            const hasAmount = amountRaw.length > 0;
            const amountValue = Number(amountRaw);
            const hasValidAmount =
                Number.isInteger(amountValue) && amountValue > 0;

            if (hasAmount && !hasRepaymentDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["installmentAmounts", i, "repaymentDate"],
                    message:
                        "Expected repayment date is required when amount is set",
                });
            }

            if (hasRepaymentDate && repaymentDate < values.loanDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["installmentAmounts", i, "repaymentDate"],
                    message:
                        "Expected repayment date must be on or after date of request",
                });
            }

            if (
                hasRepaymentDate &&
                row.status !== "paid" &&
                /^\d{4}-\d{2}-\d{2}$/.test(repaymentDate) &&
                repaymentDate < today
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["installmentAmounts", i, "repaymentDate"],
                    message: "Expected repayment date cannot be before today",
                });
            }

            if (hasRepaymentDate && /^\d{4}-\d{2}-\d{2}$/.test(repaymentDate)) {
                if (!hasValidAmount) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["installmentAmounts", i, "amount"],
                        message:
                            "Amount is required when repayment date is set",
                    });
                } else {
                    hasValidInstallment = true;
                    validInstallmentAmounts.push(amountValue);

                    if (
                        Number.isInteger(amountRequested) &&
                        amountRequested > 0 &&
                        amountValue > amountRequested
                    ) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["installmentAmounts", i, "amount"],
                            message: `Installment amount cannot exceed amount requested ($${amountRequested})`,
                        });
                    }
                }
            }
        });

        if (!hasValidInstallment) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
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
                    code: z.ZodIssueCode.custom,
                    path: ["installmentAmounts"],
                    message: `Total of installments ($${totalInstallments}) must equal amount requested ($${amountRequested})`,
                });
            }
        }
    });

type FormValues = z.infer<typeof formSchema>;

const textareaClass = cn(
    "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
);

export type AdvanceRequestWorkerOption = { id: string; name: string };

function detailToDefaultValues(detail: AdvanceRequestDetail): FormValues {
    const { request, advances, purpose } = detail;
    return {
        workerId: request.workerId,
        loanDate: request.requestDate,
        amount: String(request.amountRequested),
        purpose: purpose ?? "",
        installmentAmounts:
            advances.length > 0
                ? advances.map((a) => ({
                      amount: String(a.amount),
                      repaymentDate: a.repaymentDate ?? "",
                      status: a.status,
                  }))
                : [{ amount: "", repaymentDate: "", status: "loan" }],
    };
}

function AdvanceRequestReadOnlyBody({
    detail,
}: {
    detail: AdvanceRequestDetail;
}) {
    const { request, advances, purpose } = detail;

    return (
        <FieldGroup className="gap-6">
            <Card>
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        Advance information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                        <User className="size-5 shrink-0 text-muted-foreground" />
                        <Link
                            href={`/dashboard/worker/${request.workerId}/view`}
                            className="font-medium text-primary underline underline-offset-4 hover:opacity-80">
                            {request.workerName}
                        </Link>
                    </div>

                    <div
                        className="flex items-center gap-2"
                        data-testid="advance-detail-loan-date">
                        <Calendar className="size-5 shrink-0 text-muted-foreground" />
                        <span className="text-primary">
                            {localDateDmy(request.requestDate)}
                        </span>
                    </div>

                    <div
                        className="flex items-center gap-2"
                        data-testid="advance-detail-amount">
                        <DollarSign className="size-5 shrink-0 text-muted-foreground" />
                        <span className="text-primary">
                            {request.amountRequested}
                        </span>
                    </div>

                    <div className="space-y-1 pt-5">
                        <p className="text-lg font-medium">
                            Purpose of advance
                        </p>
                        <p className="whitespace-pre-wrap text-md text-muted-foreground">
                            {purpose || "—"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        Repayment terms
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Each installment is tracked as a separate advance
                    </p>
                </CardHeader>
                <CardContent className="pt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Installment amount</TableHead>
                                <TableHead>Expected repayment date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {advances.map((adv) => (
                                <TableRow key={adv.id}>
                                    <TableCell>{`$${adv.amount}`}</TableCell>
                                    <TableCell>
                                        {adv.repaymentDate
                                            ? localDateDmy(adv.repaymentDate)
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                loanPaidToneClassName[
                                                    adv.status
                                                ]
                                            }>
                                            {adv.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell>
                                    {`$${advances.reduce(
                                        (sum, adv) => sum + adv.amount,
                                        0,
                                    )}`}
                                </TableCell>
                                <TableCell />
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </FieldGroup>
    );
}

type AdvanceRequestFormEditableProps = {
    workers: AdvanceRequestWorkerOption[];
    initialWorkerId?: string;
    initialData?: AdvanceRequestDetail;
    advanceRequestId?: string;
};

function AdvanceRequestFormEditable({
    workers,
    initialWorkerId,
    initialData,
    advanceRequestId,
}: AdvanceRequestFormEditableProps) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const isEditMode = Boolean(initialData && advanceRequestId);
    const showInstallmentStatusColumn = isEditMode;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: initialData
            ? detailToDefaultValues(initialData)
            : {
                  workerId: initialWorkerId ?? "",
                  loanDate: localIsoDateYmd(),
                  amount: "",
                  purpose: "",
                  installmentAmounts: [
                      { amount: "", repaymentDate: "", status: "loan" },
                  ],
              },
    });

    const { fields, insert, remove } = useFieldArray({
        control: form.control,
        name: "installmentAmounts",
    });

    /** RHF `field.id` is not stable across SSR vs client; render rows only after mount. */
    const [installmentRowsMounted, setInstallmentRowsMounted] =
        React.useState(false);
    React.useEffect(() => {
        setInstallmentRowsMounted(true);
    }, []);

    const formId = "advance-request-form";

    async function onSubmit(data: FormValues) {
        setError(null);
        setPending(true);

        const result =
            isEditMode && advanceRequestId
                ? await updateAdvanceRequest(advanceRequestId, {
                      workerId: data.workerId,
                      loanDate: data.loanDate,
                      amount: data.amount,
                      purpose: data.purpose,
                      installmentAmounts: data.installmentAmounts,
                  })
                : await createAdvanceRequest({
                      workerId: data.workerId,
                      loanDate: data.loanDate,
                      amount: data.amount,
                      purpose: data.purpose,
                      installmentAmounts: data.installmentAmounts,
                  });
        setPending(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        router.push(
            isEditMode
                ? `/dashboard/advance/${advanceRequestId}`
                : "/dashboard/advance/all",
        );
        router.refresh();
    }

    const scrollToFirstError = () => {
        const firstError = document.querySelector(
            '[data-slot="field-error"], [role="alert"]',
        );
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <form
            id={formId}
            data-testid="advance-request-form"
            onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}
            className="space-y-6"
            autoComplete="off">
            {error ? (
                <p className="text-destructive text-sm" role="alert">
                    {error}
                </p>
            ) : null}

            <FieldGroup className="gap-6">
                <Card>
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                            Advance information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                            <Controller
                                name="workerId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="min-w-0 space-y-2">
                                        <FieldLabel
                                            htmlFor={`${formId}-worker`}>
                                            Employee
                                        </FieldLabel>
                                        <SelectSearch
                                            options={workers.map((w) => ({
                                                value: w.id,
                                                label: w.name,
                                            }))}
                                            value={field.value}
                                            onChange={(nextValue) =>
                                                field.onChange(nextValue)
                                            }
                                            disabled={pending}
                                            id={`${formId}-worker`}
                                            data-testid="advance-request-worker"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Search or select employee…"
                                            searchPlaceholder="Search employees…"
                                            emptyText="No employee found."
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="loanDate"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="min-w-0 space-y-2">
                                        <FieldLabel
                                            htmlFor={`${formId}-loan-date`}>
                                            Date of request
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${formId}-loan-date`}
                                            type="date"
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="amount"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field
                                    data-invalid={fieldState.invalid}
                                    className="space-y-2">
                                    <FieldLabel htmlFor={`${formId}-amount`}>
                                        Amount requested
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={`${formId}-amount`}
                                            type="number"
                                            step={1}
                                            min={1}
                                            inputMode="numeric"
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
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

                        <Controller
                            name="purpose"
                            control={form.control}
                            render={({ field }) => (
                                <Field className="space-y-2">
                                    <FieldLabel htmlFor={`${formId}-purpose`}>
                                        Purpose of advance
                                    </FieldLabel>
                                    <textarea
                                        {...field}
                                        id={`${formId}-purpose`}
                                        rows={4}
                                        disabled={pending}
                                        className={textareaClass}
                                    />
                                </Field>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="gap-4">
                    <CardHeader className="border-b pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                            Repayment terms
                        </CardTitle>
                        {installmentRowsMounted && (
                            <CardAction>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={pending}
                                    aria-label="Add installment row"
                                    className="border-white bg-white text-black hover:bg-white/90 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                                    onClick={() =>
                                        insert(fields.length, {
                                            amount: "",
                                            repaymentDate: "",
                                            status: "loan",
                                        })
                                    }>
                                    <Plus className="size-4" />
                                </Button>
                            </CardAction>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2 pt-2">
                        {!installmentRowsMounted ? (
                            <div
                                className="space-y-2"
                                aria-busy="true"
                                data-testid="installment-rows-ssr-placeholder">
                                <div className="hidden gap-x-2 sm:grid sm:grid-cols-[1fr_1fr_auto_2.25rem] sm:items-end">
                                    <div className="bg-muted/30 h-4 w-32 max-w-full rounded" />
                                    <div className="bg-muted/30 h-4 w-36 max-w-full rounded" />
                                    <div className="bg-muted/30 h-4 w-16 max-w-full rounded" />
                                    <div className="size-9" aria-hidden />
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_2.25rem] sm:items-center">
                                    <div className="bg-muted/30 h-9 w-full rounded-md border border-dashed border-muted-foreground/20" />
                                    <div className="bg-muted/30 h-9 w-full rounded-md border border-dashed border-muted-foreground/20" />
                                    <div className="bg-muted/30 size-9 shrink-0 rounded-md border border-dashed border-muted-foreground/20" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div
                                    className={cn(
                                        "hidden gap-x-2 text-sm leading-none font-medium sm:grid sm:items-end",
                                        showInstallmentStatusColumn
                                            ? "sm:grid-cols-[1fr_1fr_auto_2.25rem]"
                                            : "sm:grid-cols-[1fr_1fr_2.25rem]",
                                    )}>
                                    <span id={`${formId}-installment-col`}>
                                        Installment amount
                                    </span>
                                    <span id={`${formId}-repayment-col`}>
                                        Expected repayment date
                                    </span>
                                    {showInstallmentStatusColumn ? (
                                        <span>Status</span>
                                    ) : null}
                                    <span
                                        className="size-9 shrink-0"
                                        aria-hidden
                                    />
                                </div>
                                {fields.map((row, index) =>
                                    (() => {
                                        const isPaidInstallment =
                                            form.getValues(
                                                `installmentAmounts.${index}.status`,
                                            ) === "paid";

                                        return (
                                            <div
                                                key={row.id}
                                                role="group"
                                                aria-label={`Installment row ${index + 1}`}
                                                className={cn(
                                                    "grid grid-cols-1 gap-2 sm:items-start",
                                                    showInstallmentStatusColumn
                                                        ? "sm:grid-cols-[1fr_1fr_auto_2.25rem]"
                                                        : "sm:grid-cols-[1fr_1fr_2.25rem]",
                                                )}>
                                                <Controller
                                                    name={`installmentAmounts.${index}.amount`}
                                                    control={form.control}
                                                    render={({
                                                        field,
                                                        fieldState,
                                                    }) => (
                                                        <Field
                                                            data-invalid={
                                                                fieldState.invalid
                                                            }
                                                            className="min-w-0 gap-1.5">
                                                            <Input
                                                                {...field}
                                                                id={`${formId}-inst-${index}`}
                                                                type="number"
                                                                min={0}
                                                                step={1}
                                                                inputMode="decimal"
                                                                disabled={
                                                                    pending ||
                                                                    isPaidInstallment
                                                                }
                                                                aria-labelledby={`${formId}-installment-col`}
                                                                aria-invalid={
                                                                    fieldState.invalid
                                                                }
                                                            />
                                                            {fieldState.invalid && (
                                                                <FieldError
                                                                    errors={[
                                                                        fieldState.error,
                                                                    ]}
                                                                />
                                                            )}
                                                        </Field>
                                                    )}
                                                />
                                                <Controller
                                                    name={`installmentAmounts.${index}.repaymentDate`}
                                                    control={form.control}
                                                    render={({
                                                        field,
                                                        fieldState,
                                                    }) => (
                                                        <Field
                                                            data-invalid={
                                                                fieldState.invalid
                                                            }
                                                            className="min-w-0 gap-1.5">
                                                            <Input
                                                                {...field}
                                                                id={`${formId}-repayment-${index}`}
                                                                type="date"
                                                                min={
                                                                    isPaidInstallment
                                                                        ? undefined
                                                                        : localIsoDateYmd()
                                                                }
                                                                disabled={
                                                                    pending ||
                                                                    isPaidInstallment
                                                                }
                                                                aria-labelledby={`${formId}-repayment-col`}
                                                                aria-invalid={
                                                                    fieldState.invalid
                                                                }
                                                            />
                                                            {fieldState.invalid && (
                                                                <FieldError
                                                                    errors={[
                                                                        fieldState.error,
                                                                    ]}
                                                                />
                                                            )}
                                                        </Field>
                                                    )}
                                                />
                                                {showInstallmentStatusColumn ? (
                                                    <Controller
                                                        name={`installmentAmounts.${index}.status`}
                                                        control={form.control}
                                                        render={({ field }) => {
                                                            const status =
                                                                field.value ??
                                                                "loan";
                                                            return (
                                                                <div className="flex h-9 items-center">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            loanPaidToneClassName[
                                                                                status
                                                                            ]
                                                                        }>
                                                                        {status}
                                                                    </Badge>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                ) : null}
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    disabled={
                                                        pending ||
                                                        fields.length === 1
                                                    }
                                                    aria-label="Remove this installment row"
                                                    onClick={() =>
                                                        remove(index)
                                                    }>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        );
                                    })(),
                                )}
                            </div>
                        )}
                        {(() => {
                            const watchedAmount = form.watch("amount");
                            const watchedInstallments =
                                form.watch("installmentAmounts") ?? [];
                            const amountRequested = Number(watchedAmount);
                            const totalInstallments =
                                watchedInstallments.reduce(
                                    (sum, row) =>
                                        sum +
                                        (Number.isInteger(Number(row.amount)) &&
                                        Number(row.amount) > 0
                                            ? Number(row.amount)
                                            : 0),
                                    0,
                                );
                            const hasValidInstallments =
                                watchedInstallments.some(
                                    (row) =>
                                        Number.isInteger(Number(row.amount)) &&
                                        Number(row.amount) > 0,
                                );
                            if (
                                !(
                                    Number.isInteger(amountRequested) &&
                                    amountRequested > 0 &&
                                    hasValidInstallments
                                )
                            ) {
                                return null;
                            }
                            const matches =
                                totalInstallments === amountRequested;
                            return (
                                <p
                                    className={`text-sm ${
                                        matches
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-destructive"
                                    }`}>
                                    Total: {`$${totalInstallments}`} /{" "}
                                    {`$${amountRequested}`} requested
                                </p>
                            );
                        })()}
                        {form.formState.errors.installmentAmounts?.message && (
                            <p
                                className="text-destructive text-sm"
                                role="alert">
                                {
                                    form.formState.errors.installmentAmounts
                                        .message
                                }
                            </p>
                        )}
                    </CardContent>
                </Card>

            </FieldGroup>

            <div className="flex flex-col items-end gap-3">
                {(error ||
                    form.formState.errors.installmentAmounts?.message) && (
                    <p className="text-destructive text-sm w-full" role="alert">
                        {error ??
                            form.formState.errors.installmentAmounts?.message}
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={pending || workers.length === 0}
                    data-testid="advance-request-submit">
                    {pending
                        ? isEditMode
                            ? "Saving…"
                            : "Submitting…"
                        : isEditMode
                          ? "Save changes"
                          : "Submit request"}
                </Button>
            </div>
        </form>
    );
}

export function AdvanceRequestForm({
    workers = [],
    initialWorkerId,
    initialData,
    advanceRequestId,
    readOnly = false,
}: {
    workers?: AdvanceRequestWorkerOption[];
    initialWorkerId?: string;
    initialData?: AdvanceRequestDetail;
    advanceRequestId?: string;
    readOnly?: boolean;
}) {
    if (readOnly && initialData) {
        return (
            <div data-testid="advance-detail">
                <div data-testid="advance-request-form">
                    <AdvanceRequestReadOnlyBody detail={initialData} />
                </div>
            </div>
        );
    }

    return (
        <AdvanceRequestFormEditable
            workers={workers}
            initialWorkerId={initialWorkerId}
            initialData={initialData}
            advanceRequestId={advanceRequestId}
        />
    );
}
