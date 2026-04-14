"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { normalizeHmTime } from "./timesheet-time-utils";

type TimesheetTimeFieldProps = {
    id: string;
    value: string;
    disabled?: boolean;
    required?: boolean;
    "aria-invalid"?: boolean;
    onValueChange: (nextHm: string) => void;
};

export function TimesheetTimeField({
    id,
    value,
    disabled = false,
    required = false,
    "aria-invalid": ariaInvalid,
    onValueChange,
}: TimesheetTimeFieldProps) {
    return (
        <Input
            id={id}
            type="time"
            step="60"
            value={value}
            required={required}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            onChange={(event) => {
                onValueChange(normalizeHmTime(event.target.value));
            }}
        />
    );
}
