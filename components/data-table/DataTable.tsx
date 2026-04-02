"use client";

import * as React from "react";
import {
    ColumnFiltersState,
    SortingState,
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type RowSelectionState,
    type OnChangeFn,
} from "@tanstack/react-table";

import type { DataTableProps } from "@/types/data-table";
import { containsCi, globalSearchRowPredicate } from "./filtering";
import { isGloballySearchableColumn } from "./columnMeta";
import { useUrlSyncedGlobalFilter } from "./useUrlSyncedGlobalFilter";
import { DataTableView } from "./DataTableView";

export function DataTable<TData, TValue>({
    columns,
    data,
    searchParamKey,
    syncSearchToUrl = true,
    actions,
    pageSize = 20,
    enableRowSelection,
    rowSelection,
    onRowSelectionChange,
    getRowId,
}: DataTableProps<TData, TValue>) {
    const effectiveSearchParamKey = searchParamKey ?? "search";
    const { value: globalFilter, setValue: setGlobalFilter } =
        useUrlSyncedGlobalFilter({
            searchParamKey: effectiveSearchParamKey,
            syncSearchToUrl,
            debounceMs: 300,
        });

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data,
        columns,
        initialState: {
            pagination: {
                pageSize,
            },
        },
        state: {
            sorting,
            columnFilters,
            globalFilter,
            ...(enableRowSelection
                ? { rowSelection: (rowSelection ?? {}) as RowSelectionState }
                : undefined),
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getSortedRowModel: getSortedRowModel(),
        onGlobalFilterChange: (value) => setGlobalFilter(String(value ?? "")),
        ...(enableRowSelection
            ? {
                  enableRowSelection: true,
                  onRowSelectionChange:
                      onRowSelectionChange as OnChangeFn<RowSelectionState>,
                  getRowId,
              }
            : undefined),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        defaultColumn: {
            filterFn: containsCi<TData>(),
        },
        globalFilterFn: (row, _columnId, filterValue) =>
            globalSearchRowPredicate(row, filterValue),
    });

    const showSearch = table
        .getVisibleLeafColumns()
        .some((col) => isGloballySearchableColumn(col));

    return (
        <DataTableView
            table={table}
            columnsCount={columns.length}
            showSearch={showSearch}
            globalFilter={globalFilter ?? ""}
            onGlobalFilterChange={setGlobalFilter}
            actions={actions}
        />
    );
}

