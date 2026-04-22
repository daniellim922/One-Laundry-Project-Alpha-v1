"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

const MONTH_OPTIONS = [
    { month: 1, short: "Jan", long: "January" },
    { month: 2, short: "Feb", long: "February" },
    { month: 3, short: "Mar", long: "March" },
    { month: 4, short: "Apr", long: "April" },
    { month: 5, short: "May", long: "May" },
    { month: 6, short: "Jun", long: "June" },
    { month: 7, short: "Jul", long: "July" },
    { month: 8, short: "Aug", long: "August" },
    { month: 9, short: "Sep", long: "September" },
    { month: 10, short: "Oct", long: "October" },
    { month: 11, short: "Nov", long: "November" },
    { month: 12, short: "Dec", long: "December" },
] as const;

/** All calendar months 1–12; use for default selection and year-change reset. */
export function allMonthsSet(): Set<number> {
    return new Set(MONTH_OPTIONS.map((m) => m.month));
}

const ALL_MONTHS = allMonthsSet();

function triggerSummary(selected: Set<number>): string {
    if (selected.size === 0) {
        return "No months";
    }
    if (selected.size === 12) {
        return "All months";
    }
    if (selected.size <= 3) {
        const labels = MONTH_OPTIONS.filter((m) => selected.has(m.month)).map(
            (m) => m.short,
        );
        return labels.join(", ");
    }
    return `${selected.size} months`;
}

type Props = {
    selected: Set<number>;
    onChange: (next: Set<number>) => void;
    className?: string;
    disabled?: boolean;
    "aria-label"?: string;
};

export function MonthMultiSelectFilter({
    selected,
    onChange,
    className,
    disabled,
    "aria-label": ariaLabel = "Filter by months",
}: Props) {
    const [open, setOpen] = React.useState(false);

    const toggleMonth = (month: number) => {
        const next = new Set(selected);
        if (next.has(month)) {
            next.delete(month);
        } else {
            next.add(month);
        }
        onChange(next);
    };

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
                    className={cn(
                        "h-9 min-w-36 max-w-56 justify-between px-3 py-2 font-normal shadow-xs",
                        className,
                    )}>
                    <span className="truncate">{triggerSummary(selected)}</span>
                    <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) min-w-60 p-0 sm:min-w-70"
                align="start">
                <Command>
                    <CommandInput placeholder="Search months…" />
                    <CommandList>
                        <CommandEmpty>No month found.</CommandEmpty>
                        <CommandGroup>
                            {MONTH_OPTIONS.map((m) => {
                                const isOn = selected.has(m.month);
                                return (
                                    <CommandItem
                                        key={m.month}
                                        value={`${m.long} ${m.short} ${m.month}`}
                                        onSelect={() => {
                                            toggleMonth(m.month);
                                        }}>
                                        <Check
                                            className={cn(
                                                "size-4 shrink-0",
                                                isOn
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                        <span>
                                            {m.long}{" "}
                                            <span className="text-muted-foreground">
                                                ({m.short})
                                            </span>
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
                <div className="flex gap-2 border-t p-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        onClick={() => onChange(new Set(ALL_MONTHS))}>
                        Select all
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        onClick={() => onChange(new Set())}>
                        Clear
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
