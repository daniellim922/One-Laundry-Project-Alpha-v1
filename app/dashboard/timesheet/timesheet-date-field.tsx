"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    dateToIso,
    formatDmyInput,
    isoToDmy,
    parseDmyToIsoStrict,
    parseIsoToDateStrict,
} from "./timesheet-date-utils";

type TimesheetDateFieldProps = {
    id: string;
    value: string;
    disabled?: boolean;
    required?: boolean;
    "aria-invalid"?: boolean;
    onValueChange: (nextIso: string) => void;
};

export function TimesheetDateField({
    id,
    value,
    disabled = false,
    required = false,
    "aria-invalid": ariaInvalid,
    onValueChange,
}: TimesheetDateFieldProps) {
    const [open, setOpen] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState(isoToDmy(value));
    const selectedDate = parseIsoToDateStrict(value) ?? undefined;
    const [month, setMonth] = React.useState<Date | undefined>(
        selectedDate ?? new Date(),
    );

    React.useEffect(() => {
        setDisplayValue(isoToDmy(value));
        const parsed = parseIsoToDateStrict(value);
        if (parsed) {
            setMonth(parsed);
        }
    }, [value]);

    return (
        <InputGroup data-disabled={disabled || undefined}>
            <InputGroupInput
                id={id}
                value={displayValue}
                placeholder="DD/MM/YYYY"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                required={required}
                aria-invalid={ariaInvalid}
                onChange={(event) => {
                    const nextDisplay = formatDmyInput(event.target.value);
                    setDisplayValue(nextDisplay);

                    if (nextDisplay.trim().length === 0) {
                        onValueChange("");
                        return;
                    }

                    const parsedIso = parseDmyToIsoStrict(nextDisplay);
                    onValueChange(parsedIso ?? "");

                    const parsedDate = parseIsoToDateStrict(parsedIso ?? "");
                    if (parsedDate) {
                        setMonth(parsedDate);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && !disabled) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            />
            <InputGroupAddon align="inline-end">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <InputGroupButton
                            variant="ghost"
                            size="icon-xs"
                            disabled={disabled}
                            aria-label="Select date">
                            <CalendarIcon />
                            <span className="sr-only">Select date</span>
                        </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}>
                        <Calendar
                            mode="single"
                            month={month}
                            onMonthChange={setMonth}
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (!date) {
                                    setDisplayValue("");
                                    onValueChange("");
                                    return;
                                }

                                const iso = dateToIso(date);
                                onValueChange(iso);
                                setDisplayValue(isoToDmy(iso));
                                setMonth(date);
                                setOpen(false);
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </InputGroupAddon>
        </InputGroup>
    );
}
