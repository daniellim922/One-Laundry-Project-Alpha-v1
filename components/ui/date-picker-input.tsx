"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

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
import { cn } from "@/lib/utils";
import {
    clampIsoDateToRange,
    dateToLocalIsoYmd,
    formatDmyInput,
    parseDmyToIsoStrict,
    parseIsoToDateStrict,
} from "@/utils/time/calendar-date";
import { formatEnGbDmyNumericFromIso } from "@/utils/time/intl-en-gb";

export type DatePickerInputProps = {
    id: string;
    value: string;
    disabled?: boolean;
    required?: boolean;
    "aria-invalid"?: boolean;
    onValueChange: (nextIso: string) => void;
    /** Inclusive minimum ISO calendar date (YYYY-MM-DD). */
    min?: string;
    /** Inclusive maximum ISO calendar date (YYYY-MM-DD). */
    max?: string;
    suppressHydrationWarning?: boolean;
    className?: string;
    "aria-labelledby"?: string;
};

export function DatePickerInput({
    id,
    value,
    disabled = false,
    required = false,
    "aria-invalid": ariaInvalid,
    onValueChange,
    min,
    max,
    suppressHydrationWarning,
    className,
    "aria-labelledby": ariaLabelledBy,
}: DatePickerInputProps) {
    const [open, setOpen] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState(
        formatEnGbDmyNumericFromIso(value),
    );
    const selectedDate = parseIsoToDateStrict(value) ?? undefined;
    const [month, setMonth] = React.useState<Date | undefined>(
        selectedDate ?? new Date(),
    );

    const disabledDays = React.useMemo((): Matcher | Matcher[] | undefined => {
        const matchers: Matcher[] = [];
        const minD = min ? parseIsoToDateStrict(min) : null;
        const maxD = max ? parseIsoToDateStrict(max) : null;
        if (minD) {
            matchers.push({ before: minD });
        }
        if (maxD) {
            matchers.push({ after: maxD });
        }
        if (matchers.length === 0) return undefined;
        return matchers.length === 1 ? matchers[0]! : matchers;
    }, [min, max]);

    React.useEffect(() => {
        setDisplayValue(formatEnGbDmyNumericFromIso(value));
        const parsed = parseIsoToDateStrict(value);
        if (parsed) {
            setMonth(parsed);
        }
    }, [value]);

    function emitIso(iso: string) {
        const clamped =
            iso === "" ? "" : clampIsoDateToRange(iso, min, max);
        onValueChange(clamped);
        setDisplayValue(
            iso === "" ? "" : formatEnGbDmyNumericFromIso(clamped),
        );
        const p = parseIsoToDateStrict(clamped);
        if (p) setMonth(p);
    }

    return (
        <InputGroup
            data-disabled={disabled || undefined}
            className={cn(className)}>
            <InputGroupInput
                id={id}
                value={displayValue}
                placeholder="DD/MM/YYYY"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                required={required}
                aria-invalid={ariaInvalid}
                aria-labelledby={ariaLabelledBy}
                suppressHydrationWarning={suppressHydrationWarning}
                onChange={(event) => {
                    const nextDisplay = formatDmyInput(event.target.value);
                    setDisplayValue(nextDisplay);

                    if (nextDisplay.trim().length === 0) {
                        emitIso("");
                        return;
                    }

                    const parsedIso = parseDmyToIsoStrict(nextDisplay);
                    if (!parsedIso) {
                        onValueChange("");
                        return;
                    }

                    emitIso(parsedIso);
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
                            type="button"
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
                            disabled={disabledDays}
                            onSelect={(date) => {
                                if (!date) {
                                    emitIso("");
                                    setOpen(false);
                                    return;
                                }

                                const iso = dateToLocalIsoYmd(date);
                                emitIso(iso);
                                setOpen(false);
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </InputGroupAddon>
        </InputGroup>
    );
}
