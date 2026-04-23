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
import {
    WORKER_EMPLOYMENT_TYPES,
    type WorkerEmploymentType,
} from "@/types/status";

type WorkerIdMeta = { id: string; employmentType: WorkerEmploymentType };

function included(checked: Record<string, boolean>, id: string): boolean {
    return checked[id] !== false;
}

function sliceBulk(
    workers: WorkerIdMeta[],
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

function typeTriggerSummary(
    allWorkers: WorkerIdMeta[],
    checked: Record<string, boolean>,
): string {
    const withWorkers: {
        t: WorkerEmploymentType;
        state: boolean | "indeterminate";
    }[] = [];
    for (const t of WORKER_EMPLOYMENT_TYPES) {
        const inType = allWorkers.filter((w) => w.employmentType === t);
        if (inType.length === 0) continue;
        withWorkers.push({ t, state: sliceBulk(inType, checked) });
    }
    if (withWorkers.length === 0) {
        return "No workers";
    }
    const allOn = withWorkers.every((x) => x.state === true);
    const allOff = withWorkers.every((x) => x.state === false);
    if (allOn) {
        return "All types";
    }
    if (allOff) {
        return "None";
    }
    return "Mixed";
}

type Props = {
    allWorkers: WorkerIdMeta[];
    checked: Record<string, boolean>;
    onTypeBulkChange: (t: WorkerEmploymentType, value: boolean) => void;
    className?: string;
    disabled?: boolean;
};

export function EmploymentTypeBulkSelect({
    allWorkers,
    checked,
    onTypeBulkChange,
    className,
    disabled,
}: Props) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Bulk select by employment type"
                    disabled={disabled}
                    className={cn(
                        "h-9 min-w-36 max-w-56 justify-between px-3 py-2 font-normal shadow-xs",
                        className,
                    )}>
                    <span className="truncate">
                        {typeTriggerSummary(allWorkers, checked)}
                    </span>
                    <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) min-w-60 p-0 sm:min-w-70"
                align="start">
                <Command>
                    <CommandInput placeholder="Search types…" />
                    <CommandList>
                        <CommandEmpty>No type found.</CommandEmpty>
                        <CommandGroup>
                            {WORKER_EMPLOYMENT_TYPES.map((t) => {
                                const inType = allWorkers.filter(
                                    (w) => w.employmentType === t,
                                );
                                const bulkState = sliceBulk(inType, checked);
                                const isOn = bulkState === true;
                                const isInd = bulkState === "indeterminate";
                                return (
                                    <CommandItem
                                        key={t}
                                        value={t}
                                        disabled={inType.length === 0}
                                        onSelect={() => {
                                            if (bulkState === "indeterminate") {
                                                return;
                                            }
                                            onTypeBulkChange(t, !isOn);
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
                                        <span>{t}</span>
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
