"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
    advanceRequestFormSchema,
    type AdvanceRequestFormValues,
} from "@/db/schemas/advance-request";
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
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { Badge } from "@/components/ui/badge";
import { installmentToneClassName } from "@/types/badge-tones";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
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

type FormValues = AdvanceRequestFormValues;

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
        requestDate: request.requestDate,
        amount: request.amountRequested,
        purpose: purpose ?? "",
        installmentAmounts:
            advances.length > 0
                ? advances.map((a) => ({
                      amount: a.amount,
                      repaymentDate: a.repaymentDate ?? "",
                      status: a.status,
                  }))
                : [
                      {
                          amount: undefined,
                          repaymentDate: "",
                          status: "Installment Loan",
                      },
                  ],
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
                <CardContent className="space-y-4 pt-4">
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <div className="flex min-w-0 items-center gap-3">
                            <User
                                className="size-6 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                            <div className="min-w-0 space-y-1">
                                <p className="text-muted-foreground text-sm leading-none font-medium">
                                    Employee
                                </p>
                                <Link
                                    href={`/dashboard/worker/${request.workerId}/view`}
                                    className="font-medium text-primary underline underline-offset-4 hover:opacity-80">
                                    {request.workerName}
                                </Link>
                            </div>
                        </div>

                        <div
                            className="flex min-w-0 items-center gap-3"
                            data-testid="advance-detail-request-date">
                            <Calendar
                                className="size-6 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                            <div className="min-w-0 space-y-1">
                                <p className="text-muted-foreground text-sm leading-none font-medium">
                                    Date of request
                                </p>
                                <span className="text-primary">
                                    {formatEnGbDmyNumericFromCalendar(
                                        request.requestDate,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex items-center gap-3"
                        data-testid="advance-detail-amount">
                        <DollarSign
                            className="size-6 shrink-0 text-muted-foreground"
                            aria-hidden
                        />
                        <div className="min-w-0 space-y-1">
                            <p className="text-muted-foreground text-sm leading-none font-medium">
                                Amount requested
                            </p>
                            <span className="text-primary">
                                ${request.amountRequested}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                        <p className="text-lg font-medium">Purpose of advance</p>
                        <p className="text-md whitespace-pre-wrap text-muted-foreground">
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
                                            ? formatEnGbDmyNumericFromCalendar(adv.repaymentDate)
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                installmentToneClassName[
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
        resolver: zodResolver(advanceRequestFormSchema),
        mode: "onChange",
        defaultValues: initialData
            ? detailToDefaultValues(initialData)
            : {
                  workerId: initialWorkerId ?? "",
                  requestDate: dateToLocalIsoYmd(),
                  amount: undefined as unknown as number,
                  purpose: "",
                  installmentAmounts: [
                      {
                          amount: undefined,
                          repaymentDate: "",
                          status: "Installment Loan",
                      },
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
                      requestDate: data.requestDate,
                      amount: data.amount,
                      purpose: data.purpose,
                      installmentAmounts: data.installmentAmounts,
                  })
                : await createAdvanceRequest({
                      workerId: data.workerId,
                      requestDate: data.requestDate,
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
                                name="requestDate"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="min-w-0 space-y-2">
                                        <FieldLabel
                                            htmlFor={`${formId}-request-date`}>
                                            Date of request
                                        </FieldLabel>
                                        <DatePickerInput
                                            id={`${formId}-request-date`}
                                            value={field.value}
                                            onValueChange={field.onChange}
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
                                            id={`${formId}-amount`}
                                            type="number"
                                            step={1}
                                            min={1}
                                            inputMode="numeric"
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
                                            name={field.name}
                                            ref={field.ref}
                                            onBlur={field.onBlur}
                                            value={
                                                field.value == null ||
                                                Number.isNaN(field.value)
                                                    ? ""
                                                    : field.value
                                            }
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                field.onChange(
                                                    raw === ""
                                                        ? undefined
                                                        : Number.parseInt(
                                                              raw,
                                                              10,
                                                          ),
                                                );
                                            }}
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
                                            amount: undefined,
                                            repaymentDate: "",
                                            status: "Installment Loan",
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
                                <div className="hidden gap-x-2 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_2.25rem] sm:items-end">
                                    <div className="bg-muted/30 h-4 w-32 max-w-full rounded" />
                                    <div className="bg-muted/30 h-4 w-36 max-w-full rounded" />
                                    <div className="bg-muted/30 h-4 w-16 max-w-full rounded" />
                                    <div className="size-9" aria-hidden />
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] sm:items-center">
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
                                            ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_2.25rem]"
                                            : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]",
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
                                            ) === "Installment Paid";

                                        return (
                                            <div
                                                key={row.id}
                                                role="group"
                                                aria-label={`Installment row ${index + 1}`}
                                                className={cn(
                                                    "grid grid-cols-1 gap-2 sm:items-start",
                                                    showInstallmentStatusColumn
                                                        ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_2.25rem]"
                                                        : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]",
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
                                                                name={field.name}
                                                                ref={field.ref}
                                                                onBlur={field.onBlur}
                                                                value={
                                                                    field.value ==
                                                                        null ||
                                                                    Number.isNaN(
                                                                        field.value,
                                                                    )
                                                                        ? ""
                                                                        : field.value
                                                                }
                                                                onChange={(e) => {
                                                                    const raw =
                                                                        e.target
                                                                            .value;
                                                                    field.onChange(
                                                                        raw ===
                                                                            ""
                                                                            ? undefined
                                                                            : Number.parseInt(
                                                                                  raw,
                                                                                  10,
                                                                              ),
                                                                    );
                                                                }}
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
                                                            <DatePickerInput
                                                                id={`${formId}-repayment-${index}`}
                                                                value={field.value ?? ""}
                                                                onValueChange={
                                                                    field.onChange
                                                                }
                                                                min={
                                                                    isPaidInstallment
                                                                        ? undefined
                                                                        : dateToLocalIsoYmd()
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
                                                                "Installment Loan";
                                                            return (
                                                                <div className="flex h-9 items-center">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            installmentToneClassName[
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
                            const amountRequested =
                                typeof watchedAmount === "number" &&
                                Number.isInteger(watchedAmount) &&
                                watchedAmount > 0
                                    ? watchedAmount
                                    : null;
                            const totalInstallments =
                                watchedInstallments.reduce(
                                    (sum, row) =>
                                        sum +
                                        (typeof row.amount === "number" &&
                                        Number.isInteger(row.amount) &&
                                        row.amount > 0
                                            ? row.amount
                                            : 0),
                                    0,
                                );
                            const hasValidInstallments =
                                watchedInstallments.some(
                                    (row) =>
                                        typeof row.amount === "number" &&
                                        Number.isInteger(row.amount) &&
                                        row.amount > 0,
                                );
                            if (
                                !(
                                    amountRequested != null &&
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
