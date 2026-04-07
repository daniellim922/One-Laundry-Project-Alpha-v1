"use client";

import * as React from "react";
import type { Column, ColumnFiltersState, Table } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { MultiSelectSearch } from "@/components/ui/MultiSelectSearch";

export type ColumnFilterOption = {
    value: string;
    label: string;
    keywords?: string;
};

export type ColumnFilterMeta = {
    filterVariant?: "text" | "multiSelect";
    filterOptions?: ColumnFilterOption[] | "auto";
    filterPlaceholder?: string;
    filterSearchPlaceholder?: string;
    filterEmptyText?: string;
    externalTextFilter?: {
        value: string;
        onChange: (next: string) => void;
    };
};

function autoOptionsForColumn<TData>(
    table: Table<TData>,
    columnId: string,
): ColumnFilterOption[] {
    const counts = new Map<string, number>();
    for (const row of table.getPreFilteredRowModel().rows) {
        const v = row.getValue(columnId);
        if (v == null) continue;
        const key = String(v);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value]) => ({ value, label: value }));
}

export function ColumnFilterCell<TData>({
    column,
    meta,
    table,
}: {
    column: Column<TData, unknown>;
    meta?: ColumnFilterMeta;
    table: Table<TData>;
}) {
    const resolvedOptions = React.useMemo(() => {
        if (meta?.filterVariant !== "multiSelect") return [];
        if (meta.filterOptions === "auto" || meta.filterOptions == null) {
            return autoOptionsForColumn(table, column.id);
        }
        return meta.filterOptions;
    }, [column.id, meta, table]);

    if (meta?.filterVariant === "multiSelect") {
        if (!resolvedOptions.length) return null;

        const active = table
            .getState()
            .columnFilters.find((filter) => filter.id === column.id);
        const current = Array.isArray(active?.value) ? active.value : [];

        return (
            <MultiSelectSearch
                options={resolvedOptions}
                value={current}
                onChange={(next) =>
                    table.setColumnFilters((prev: ColumnFiltersState) => {
                        const withoutColumn = prev.filter(
                            (filter) => filter.id !== column.id,
                        );
                        if (!next.length) {
                            return withoutColumn;
                        }
                        return [
                            ...withoutColumn,
                            { id: column.id, value: next },
                        ];
                    })
                }
                placeholder={meta.filterPlaceholder ?? "Select…"}
                searchPlaceholder={meta.filterSearchPlaceholder ?? "Search…"}
                emptyText={meta.filterEmptyText ?? "No results found."}
            />
        );
    }

    if (meta?.externalTextFilter) {
        return (
            <Input
                placeholder="Filter..."
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

    return (
        <Input
            placeholder="Filter..."
            value={currentTextValue}
            onChange={(event) => {
                const rawValue = event.target.value;
                const normalizedValue = rawValue.trim();
                table.setColumnFilters((prev: ColumnFiltersState) => {
                    const withoutColumn = prev.filter(
                        (filter) => filter.id !== column.id,
                    );
                    if (!normalizedValue) {
                        return withoutColumn;
                    }
                    return [
                        ...withoutColumn,
                        { id: column.id, value: rawValue },
                    ];
                });
            }}
            className="h-8 text-xs"
        />
    );
}
