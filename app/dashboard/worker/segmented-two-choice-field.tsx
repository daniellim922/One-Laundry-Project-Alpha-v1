"use client";

import * as React from "react";
import {
    Controller,
    type Control,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type SegmentedTwoChoiceOption<TValue extends string> = {
    value: TValue;
    label: string;
    /** Tailwind classes when this option is selected */
    activeClassName: string;
    /** Hover classes when another option is selected (inactive state) */
    inactiveHoverClassName: string;
};

type SegmentedTwoChoiceFieldProps<
    TFieldValues extends FieldValues,
    TValue extends string,
> = {
    control: Control<TFieldValues>;
    name: FieldPath<TFieldValues>;
    label: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
    options: readonly [
        SegmentedTwoChoiceOption<TValue>,
        SegmentedTwoChoiceOption<TValue>,
    ];
    ariaLabel: string;
};

export function SegmentedTwoChoiceField<
    TFieldValues extends FieldValues,
    TValue extends string,
>(props: SegmentedTwoChoiceFieldProps<TFieldValues, TValue>) {
    const { control, name, label, icon, disabled, options, ariaLabel } = props;

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => {
                const selected = field.value as TValue;

                return (
                    <Field data-invalid={fieldState.invalid} className="space-y-2">
                        <FieldLabel>
                            <span className="flex items-center gap-2">
                                {icon}
                                {label}
                            </span>
                        </FieldLabel>
                        <div
                            role="group"
                            aria-label={ariaLabel}
                            className="flex gap-2">
                            {options.map((option) => {
                                const isActive = selected === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={disabled}
                                        aria-pressed={isActive}
                                        onClick={() =>
                                            field.onChange(option.value as typeof field.value)
                                        }
                                        className={cn(
                                            "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                                            isActive
                                                ? option.activeClassName
                                                : cn(
                                                      "border-input bg-muted/50 text-muted-foreground",
                                                      option.inactiveHoverClassName,
                                                  ),
                                            disabled &&
                                                "cursor-not-allowed opacity-50",
                                        )}>
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </Field>
                );
            }}
        />
    );
}
