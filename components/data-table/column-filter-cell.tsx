"use client";

import * as React from "react";
import type { Column, ColumnFiltersState, Table } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";

export type ColumnFilterMeta = {
    filterVariant?: "text";
    filterPlaceholder?: string;
    externalTextFilter?: {
        value: string;
        onChange: (next: string) => void;
    };
};

export function ColumnFilterCell<TData>({
    column,
    meta,
    table,
}: {
    column: Column<TData, unknown>;
    meta?: ColumnFilterMeta;
    table: Table<TData>;
}) {
    if (meta?.externalTextFilter) {
        return (
            <Input
                placeholder={meta.filterPlaceholder ?? "Filter..."}
                value={meta.externalTextFilter.value}
                onChange={(event) =>
                    meta.externalTextFilter?.onChange(event.target.value)
                }
                className="h-8 text-xs"
            />
        );
    }

    const currentTextValue = (() => {
        const active = table
            .getState()
            .columnFilters.find((filter) => filter.id === column.id);
        return typeof active?.value === "string" ? active.value : "";
    })();

    const [draft, setDraft] = React.useState(currentTextValue);

    React.useEffect(() => {
        setDraft((prev) => (prev === currentTextValue ? prev : currentTextValue));
    }, [currentTextValue]);

    React.useEffect(() => {
        const handle = window.setTimeout(() => {
            const rawValue = draft;
            const normalizedValue = rawValue.trim();

            table.setColumnFilters((prev: ColumnFiltersState) => {
                const withoutColumn = prev.filter(
                    (filter) => filter.id !== column.id,
                );
                if (!normalizedValue) {
                    return withoutColumn;
                }
                return [...withoutColumn, { id: column.id, value: rawValue }];
            });
        }, 200);

        return () => window.clearTimeout(handle);
    }, [column.id, draft, table]);

    return (
        <Input
            placeholder={meta?.filterPlaceholder ?? "Filter..."}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-8 text-xs"
        />
    );
}
