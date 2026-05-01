"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function included(checked: Record<string, boolean>, id: string): boolean {
    return checked[id] !== false;
}

function sliceBulk<W extends { id: string }>(
    workers: W[],
    checked: Record<string, boolean>,
): boolean | "indeterminate" {
    if (workers.length === 0) return false;
    let on = 0;
    for (const w of workers) {
        if (included(checked, w.id)) on += 1;
    }
    if (on === workers.length) return true;
    if (on === 0) return false;
    return "indeterminate";
}

function enumTriggerSummary<W extends { id: string }, T extends string>(
    allWorkers: W[],
    checked: Record<string, boolean>,
    enumValues: readonly T[],
    getWorkerValue: (w: W) => T,
    allSelectedLabel: string,
): string {
    const withWorkers: {
        value: T;
        state: boolean | "indeterminate";
    }[] = [];
    for (const value of enumValues) {
        const inSlice = allWorkers.filter(
            (w) => getWorkerValue(w) === value,
        );
        if (inSlice.length === 0) continue;
        withWorkers.push({ value, state: sliceBulk(inSlice, checked) });
    }
    if (withWorkers.length === 0) {
        return "No workers";
    }
    const allOn = withWorkers.every((x) => x.state === true);
    const allOff = withWorkers.every((x) => x.state === false);
    if (allOn) {
        return allSelectedLabel;
    }
    if (allOff) {
        return "None";
    }
    return "Mixed";
}

export function EnumBulkSelect<W extends { id: string }, T extends string>({
    allWorkers,
    checked,
    enumValues,
    getWorkerValue,
    allSelectedLabel,
    searchPlaceholder,
    emptyMessage,
    ariaLabel,
    triggerClassName,
    onBulkChange,
    className,
    disabled,
}: {
    allWorkers: W[];
    checked: Record<string, boolean>;
    enumValues: readonly T[];
    getWorkerValue: (w: W) => T;
    allSelectedLabel: string;
    searchPlaceholder: string;
    emptyMessage: string;
    ariaLabel: string;
    triggerClassName: string;
    onBulkChange: (value: T, nextIncluded: boolean) => void;
    className?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={ariaLabel}
                    disabled={disabled}
                    className={cn(triggerClassName, className)}>
                    <span className="truncate">
                        {enumTriggerSummary(
                            allWorkers,
                            checked,
                            enumValues,
                            getWorkerValue,
                            allSelectedLabel,
                        )}
                    </span>
                    <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) min-w-60 p-0 sm:min-w-70"
                align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {enumValues.map((value) => {
                                const inSlice = allWorkers.filter(
                                    (w) => getWorkerValue(w) === value,
                                );
                                const bulkState = sliceBulk(inSlice, checked);
                                const isOn = bulkState === true;
                                const isInd = bulkState === "indeterminate";
                                return (
                                    <CommandItem
                                        key={value}
                                        value={value}
                                        disabled={inSlice.length === 0}
                                        onSelect={() => {
                                            if (bulkState === "indeterminate") {
                                                return;
                                            }
                                            onBulkChange(value, !isOn);
                                        }}>
                                        {isInd ? (
                                            <Minus className="size-4 shrink-0 text-muted-foreground" />
                                        ) : (
                                            <Check
                                                className={cn(
                                                    "size-4 shrink-0",
                                                    isOn
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                        )}
                                        <span>{value}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
