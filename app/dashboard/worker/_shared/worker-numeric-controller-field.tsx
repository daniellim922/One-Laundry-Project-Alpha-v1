"use client";

import * as React from "react";
import {
    Controller,
    type Control,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

function RequiredMark() {
    return (
        <span className="text-destructive ml-0.5" aria-hidden="true">
            *
        </span>
    );
}

function bindTextNumericField(field: {
    value: unknown;
    onChange: (v: string) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
}) {
    const str =
        field.value == null || field.value === "" ? "" : String(field.value);
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

export function WorkerNumericControllerField<T extends FieldValues>({
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
                <Field data-invalid={fieldState.invalid} className="space-y-2">
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
