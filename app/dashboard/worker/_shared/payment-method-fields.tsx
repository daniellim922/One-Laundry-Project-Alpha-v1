"use client";

import { Controller, type Control, type UseFormReturn } from "react-hook-form";
import { Building2, CreditCard, Phone } from "lucide-react";

import type {
    WorkerUpsertFormInput,
    WorkerUpsertValues,
} from "@/db/schemas/worker-employment";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { RequiredMark } from "@/app/dashboard/worker/_shared/required-mark";

type PaymentMethodFieldsProps = {
    control: Control<WorkerUpsertFormInput>;
    form: UseFormReturn<WorkerUpsertFormInput, undefined, WorkerUpsertValues>;
    formId: string;
    disabled?: boolean;
    paymentMethod: WorkerUpsertFormInput["paymentMethod"];
};

export function PaymentMethodFields({
    control,
    form,
    formId,
    disabled = false,
    paymentMethod,
}: PaymentMethodFieldsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Controller
                name="paymentMethod"
                control={control}
                render={({ field, fieldState }) => (
                    <Field
                        data-invalid={fieldState.invalid}
                        className="space-y-2">
                        <FieldLabel htmlFor={`${formId}-paymentMethod`}>
                            <span className="flex items-center gap-2">
                                <CreditCard className="size-4" />
                                Payment Method
                            </span>
                        </FieldLabel>
                        <Select
                            value={field.value ?? undefined}
                            onValueChange={(val) => {
                                const method =
                                    val as WorkerUpsertFormInput["paymentMethod"];
                                field.onChange(method);

                                if (method === "PayNow") {
                                    form.setValue("bankAccountNumber", "", {
                                        shouldDirty: true,
                                    });
                                    const currentPhone =
                                        form.getValues("phone");
                                    const currentPayNowPhone =
                                        form.getValues("payNowPhone");
                                    const phoneTrimmed = String(
                                        currentPhone ?? "",
                                    ).trim();
                                    if (!currentPayNowPhone && phoneTrimmed) {
                                        form.setValue(
                                            "payNowPhone",
                                            phoneTrimmed,
                                            { shouldDirty: true },
                                        );
                                    }
                                }

                                if (method === "Bank Transfer") {
                                    form.setValue("payNowPhone", "", {
                                        shouldDirty: true,
                                    });
                                }

                                if (method === "Cash") {
                                    form.setValue("payNowPhone", "", {
                                        shouldDirty: true,
                                    });
                                    form.setValue("bankAccountNumber", "", {
                                        shouldDirty: true,
                                    });
                                }
                            }}
                            disabled={disabled}>
                            <SelectTrigger
                                id={`${formId}-paymentMethod`}
                                aria-invalid={fieldState.invalid}>
                                <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PayNow">PayNow</SelectItem>
                                <SelectItem value="Bank Transfer">
                                    Bank Transfer
                                </SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                            </SelectContent>
                        </Select>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </Field>
                )}
            />
            {paymentMethod === "PayNow" && (
                <Controller
                    name="payNowPhone"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-payNowPhone`}>
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
                                    aria-invalid={fieldState.invalid}
                                    aria-required
                                    disabled={disabled}
                                    onChange={(e) => {
                                        field.onChange(
                                            e.target.value.replace(/\D/g, ""),
                                        );
                                    }}
                                    value={field.value ?? ""}
                                />
                                <InputGroupAddon>
                                    <Phone className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            )}
            {paymentMethod === "Bank Transfer" && (
                <Controller
                    name="bankAccountNumber"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-bankAccountNumber`}>
                                Bank Account Number
                                <RequiredMark />
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    value={field.value ?? ""}
                                    id={`${formId}-bankAccountNumber`}
                                    aria-invalid={fieldState.invalid}
                                    aria-required
                                    disabled={disabled}
                                />
                                <InputGroupAddon>
                                    <Building2 className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            )}
        </div>
    );
}
