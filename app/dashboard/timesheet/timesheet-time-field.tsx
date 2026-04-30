"use client";

import * as React from "react";

import {
    InputGroup,
    InputGroupInput,
    InputGroupAddon,
} from "@/components/ui/input-group";
import { Clock2Icon } from "lucide-react";
import { normalizeHmTime } from "@/utils/timesheet/hm-time";

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
        <InputGroup data-disabled={disabled || undefined}>
            <InputGroupInput
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
            <InputGroupAddon align="inline-end">
                <Clock2Icon className="text-muted-foreground" />
            </InputGroupAddon>
        </InputGroup>
    );
}
