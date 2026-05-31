"use client";

import * as React from "react";
import {
    Controller,
    type Control,
    type FieldArrayWithId,
    type UseFieldArrayInsert,
    type UseFieldArrayRemove,
    type UseFormGetValues,
    type UseFormWatch,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import type { AdvanceRequestFormValues } from "@/db/schemas/advance-request";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { installmentToneClassName } from "@/types/badge-tones";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";
import { cn } from "@/lib/utils";
import { EMPTY_INSTALLMENT_ROW } from "@/app/dashboard/advance/_shared/advance-request-form-defaults";

type AdvanceInstallmentFieldsProps = {
    control: Control<AdvanceRequestFormValues>;
    formId: string;
    pending: boolean;
    showInstallmentStatusColumn: boolean;
    fields: FieldArrayWithId<AdvanceRequestFormValues, "installmentAmounts">[];
    insert: UseFieldArrayInsert<AdvanceRequestFormValues, "installmentAmounts">;
    remove: UseFieldArrayRemove;
    getValues: UseFormGetValues<AdvanceRequestFormValues>;
    watch: UseFormWatch<AdvanceRequestFormValues>;
    installmentAmountsError?: string;
};

export function AdvanceInstallmentFields({
    control,
    formId,
    pending,
    showInstallmentStatusColumn,
    fields,
    insert,
    remove,
    getValues,
    watch,
    installmentAmountsError,
}: AdvanceInstallmentFieldsProps) {
    /** RHF `field.id` is not stable across SSR vs client; render rows only after mount. */
    const [installmentRowsMounted, setInstallmentRowsMounted] =
        React.useState(false);
    React.useEffect(() => {
        setInstallmentRowsMounted(true);
    }, []);

    return (
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
                                insert(fields.length, EMPTY_INSTALLMENT_ROW)
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
                            <span className="size-9 shrink-0" aria-hidden />
                        </div>
                        {fields.map((row, index) => {
                            const isPaidInstallment =
                                getValues(
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
                                        control={control}
                                        render={({ field, fieldState }) => (
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
                                                        field.value == null ||
                                                        Number.isNaN(
                                                            field.value,
                                                        )
                                                            ? ""
                                                            : field.value
                                                    }
                                                    onChange={(e) => {
                                                        const raw =
                                                            e.target.value;
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
                                        control={control}
                                        render={({ field, fieldState }) => (
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
                                            control={control}
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
                                            isPaidInstallment ||
                                            fields.length === 1
                                        }
                                        aria-label="Remove this installment row"
                                        onClick={() => remove(index)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
                <InstallmentTotalHint watch={watch} />
                {installmentAmountsError ? (
                    <p className="text-destructive text-sm" role="alert">
                        {installmentAmountsError}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

function InstallmentTotalHint({
    watch,
}: {
    watch: UseFormWatch<AdvanceRequestFormValues>;
}) {
    const watchedAmount = watch("amount");
    const watchedInstallments = watch("installmentAmounts") ?? [];
    const amountRequested =
        typeof watchedAmount === "number" &&
        Number.isInteger(watchedAmount) &&
        watchedAmount > 0
            ? watchedAmount
            : null;
    const totalInstallments = watchedInstallments.reduce(
        (sum, row) =>
            sum +
            (typeof row.amount === "number" &&
            Number.isInteger(row.amount) &&
            row.amount > 0
                ? row.amount
                : 0),
        0,
    );
    const hasValidInstallments = watchedInstallments.some(
        (row) =>
            typeof row.amount === "number" &&
            Number.isInteger(row.amount) &&
            row.amount > 0,
    );

    if (!(amountRequested != null && hasValidInstallments)) {
        return null;
    }

    const matches = totalInstallments === amountRequested;
    return (
        <p
            className={`text-sm ${
                matches
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
            }`}>
            Total: {`$${totalInstallments}`} / {`$${amountRequested}`} requested
        </p>
    );
}
