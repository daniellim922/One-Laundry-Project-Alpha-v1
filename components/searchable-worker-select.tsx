"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Worker = { id: string; name: string };

export function SearchableWorkerSelect({
    workers,
    value,
    onChange,
    name,
    required,
}: {
    workers: Worker[];
    value: string;
    onChange: (id: string, name: string) => void;
    name: string;
    required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedWorker = workers.find((w) => w.id === value);
    const filtered = React.useMemo(() => {
        if (!search.trim()) return workers;
        const q = search.toLowerCase();
        return workers.filter((w) => w.name.toLowerCase().includes(q));
    }, [workers, search]);

    const displayValue = selectedWorker?.name ?? "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div className="relative">
                    <input
                        type="hidden"
                        name={name}
                        value={value}
                        readOnly
                        required={required}
                        aria-hidden
                    />
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Select worker"
                        className={cn(
                            "flex h-9 w-full justify-between font-normal",
                            !displayValue && "text-muted-foreground",
                        )}
                        onClick={() => {
                            setOpen(true);
                            setSearch("");
                            setTimeout(() => inputRef.current?.focus(), 0);
                        }}>
                        <span className="truncate">
                            {displayValue || "Select worker"}
                        </span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-(--radix-popover-anchor-width) min-w-[200px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="p-2 border-b">
                    <Input
                        ref={inputRef}
                        placeholder="Search workers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setOpen(false);
                            }
                        }}
                        className="h-8"
                    />
                </div>
                <div className="max-h-[200px] overflow-auto p-1">
                    {filtered.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No workers found.
                        </div>
                    ) : (
                        filtered.map((w) => (
                            <button
                                key={w.id}
                                type="button"
                                className={cn(
                                    "flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    value === w.id && "bg-accent",
                                )}
                                onClick={() => {
                                    onChange(w.id, w.name);
                                    setOpen(false);
                                }}>
                                {w.name}
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
