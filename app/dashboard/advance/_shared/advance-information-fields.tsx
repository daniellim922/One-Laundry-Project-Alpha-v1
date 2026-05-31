"use client";

import { Controller, type Control } from "react-hook-form";
import { Banknote } from "lucide-react";

import type { AdvanceRequestFormValues } from "@/db/schemas/advance-request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { cn } from "@/lib/utils";
import type { AdvanceRequestWorkerOption } from "@/app/dashboard/advance/_shared/advance-request-form-defaults";

const textareaClass = cn(
    "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
);

type AdvanceInformationFieldsProps = {
    control: Control<AdvanceRequestFormValues>;
    formId: string;
    workers: AdvanceRequestWorkerOption[];
    pending: boolean;
};

export function AdvanceInformationFields({
    control,
    formId,
    workers,
    pending,
}: AdvanceInformationFieldsProps) {
    return (
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
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field
                                data-invalid={fieldState.invalid}
                                className="min-w-0 space-y-2">
                                <FieldLabel htmlFor={`${formId}-worker`}>
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
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name="requestDate"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field
                                data-invalid={fieldState.invalid}
                                className="min-w-0 space-y-2">
                                <FieldLabel htmlFor={`${formId}-request-date`}>
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
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                </div>

                <Controller
                    name="amount"
                    control={control}
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
                                                : Number.parseInt(raw, 10),
                                        );
                                    }}
                                />
                                <InputGroupAddon>
                                    <Banknote className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                <Controller
                    name="purpose"
                    control={control}
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
    );
}
