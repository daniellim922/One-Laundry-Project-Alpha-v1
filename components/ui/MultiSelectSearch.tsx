"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type Option = {
    value: string;
    label: string;
    keywords?: string;
};

export function MultiSelectSearch({
    options,
    value,
    onChange,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyText = "No results found.",
}: {
    options: Option[];
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
}) {
    const [query, setQuery] = React.useState("");

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((option) => {
            const haystack = `${option.label} ${option.value} ${option.keywords ?? ""}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [options, query]);

    const hasSelection = value.length > 0;

    return (
        <div className="space-y-1">
            <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 text-xs"
            />
            {filtered.length > 0 ? (
                <select
                    aria-label={placeholder}
                    multiple
                    value={value}
                    onChange={(event) => {
                        const next = Array.from(
                            event.currentTarget.selectedOptions,
                        ).map((option) => option.value);
                        onChange(next);
                    }}
                    className="h-24 w-full rounded-md border bg-background px-2 py-1 text-xs">
                    {filtered.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <p className="text-xs text-muted-foreground">{emptyText}</p>
            )}
            {!hasSelection ? (
                <p className="text-[10px] text-muted-foreground">
                    {placeholder}
                </p>
            ) : null}
        </div>
    );
}
