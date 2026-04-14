"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    FilterFn,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type OnChangeFn,
    type Row,
    type RowSelectionState,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    ColumnFilterCell,
    type ColumnFilterMeta,
} from "@/components/data-table/column-filter-cell";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { parseIsoToDateStrict } from "@/utils/time/calendar-date";
import { formatEnGbDmyNumeric } from "@/utils/time/intl-en-gb";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    /** Name of the URL search param to sync the filter with (e.g. "search"). */
    searchParamKey?: string;
    /** Whether the global search should sync to the URL (defaults to true). */
    syncSearchToUrl?: boolean;
    /** Whether to render the top global search input (defaults to true). */
    showGlobalSearch?: boolean;
    /** Whether to render the column filters row (defaults to true). */
    showColumnFilters?: boolean;
    /** Optional actions to render next to the search input (e.g. "Add" button) */
    actions?: React.ReactNode;
    /** Pagination size (defaults to 20). */
    pageSize?: number;
    /** Enable TanStack row selection. */
    enableRowSelection?: boolean | ((row: TData) => boolean);
    /** Controlled row selection state. */
    rowSelection?: RowSelectionState;
    /** Controlled row selection change handler. */
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    /** Stable row id accessor (required for controlled selection with non-index IDs). */
    getRowId?: (originalRow: TData, index: number) => string;
    /** Default column filters (useful for pre-filled table filter inputs). */
    initialColumnFilters?: ColumnFiltersState;
    /** Reset key for default column filters (set a new value to re-apply defaults). */
    columnFiltersResetKey?: string | number;
}

type ColumnMeta = ColumnFilterMeta & { globalSearch?: boolean };

function looksLikeIsoDateString(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function filterHaystacksFromValue(v: unknown): string[] {
    if (v == null) return [];

    if (v instanceof Date) {
        return [v.toISOString(), formatEnGbDmyNumeric(v)].map((x) =>
            x.toLowerCase(),
        );
    }

    const s = String(v);
    const out = [s.toLowerCase()];

    // Common case in this app: dates stored as ISO calendar strings (YYYY-MM-DD)
    // but displayed as DD/MM/YYYY. Let users filter using the displayed format.
    if (typeof v === "string" && looksLikeIsoDateString(v)) {
        const d = parseIsoToDateStrict(v);
        if (d) {
            out.push(formatEnGbDmyNumeric(d).toLowerCase());
        }
    }

    return out;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchParamKey,
    syncSearchToUrl = true,
    showGlobalSearch = true,
    showColumnFilters = true,
    actions,
    pageSize = 20,
    enableRowSelection,
    rowSelection,
    onRowSelectionChange,
    getRowId,
    initialColumnFilters,
    columnFiltersResetKey,
}: DataTableProps<TData, TValue>) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const effectiveSearchParamKey = searchParamKey ?? "search";

    const initialFilter = React.useMemo(() => {
        if (!syncSearchToUrl) return "";
        return searchParams.get(effectiveSearchParamKey) ?? "";
    }, [effectiveSearchParamKey, searchParams, syncSearchToUrl]);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>(initialColumnFilters ?? []);
    const [globalFilter, setGlobalFilter] = React.useState(initialFilter);

    React.useEffect(() => {
        setColumnFilters(initialColumnFilters ?? []);
    }, [columnFiltersResetKey, initialColumnFilters]);

    React.useEffect(() => {
        if (!syncSearchToUrl) return;
        const currentValue = searchParams.get(effectiveSearchParamKey) ?? "";
        setGlobalFilter((prev) =>
            prev === currentValue ? prev : currentValue,
        );
    }, [effectiveSearchParamKey, searchParams, syncSearchToUrl]);

    const updateUrlFilter = React.useCallback(
        (value: string) => {
            if (!syncSearchToUrl) return;
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(effectiveSearchParamKey, value);
            } else {
                params.delete(effectiveSearchParamKey);
            }
            router.replace(`${pathname}?${params.toString()}`);
        },
        [
            effectiveSearchParamKey,
            pathname,
            router,
            searchParams,
            syncSearchToUrl,
        ],
    );

    const handleFilterChange = (value: string) => {
        setGlobalFilter(value);
        updateUrlFilter(value);
    };

    const containsCi: FilterFn<TData> = React.useCallback(
        (row, columnId, filterValue) => {
            const search = String(filterValue ?? "")
                .trim()
                .toLowerCase();
            if (!search) return true;
            const v = row.getValue(columnId);
            const haystacks = filterHaystacksFromValue(v);
            if (haystacks.length === 0) return false;
            return haystacks.some((h) => h.includes(search));
        },
        [],
    );

    const resolvedEnableRowSelection = React.useMemo(() => {
        if (!enableRowSelection) return undefined;
        if (typeof enableRowSelection === "function") {
            return (row: Row<TData>) => enableRowSelection(row.original);
        }
        return true;
    }, [enableRowSelection]);

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
                ? { rowSelection: rowSelection ?? {} }
                : undefined),
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getSortedRowModel: getSortedRowModel(),
        onGlobalFilterChange: handleFilterChange,
        ...(enableRowSelection
            ? {
                  enableRowSelection: resolvedEnableRowSelection ?? true,
                  onRowSelectionChange,
                  getRowId,
              }
            : undefined),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        defaultColumn: {
            filterFn: containsCi,
        },
        globalFilterFn: (row, _columnId, filterValue) => {
            if (!filterValue) return true;
            const search = String(filterValue).trim().toLowerCase();
            if (!search) return true;

            // Search across visible cells by default; allow opt-out via
            // `columnDef.meta.globalSearch === false` (used by selection/actions columns).
            return row.getVisibleCells().some((cell) => {
                const meta = (cell.column.columnDef as { meta?: ColumnMeta })
                    .meta;
                if (meta?.globalSearch === false) return false;

                const v = cell.getValue();
                const haystacks = filterHaystacksFromValue(v);
                if (haystacks.length === 0) return false;
                return haystacks.some((h) => h.includes(search));
            });
        },
    });

    const canSearchAnyColumn = table
        .getVisibleLeafColumns()
        .some(
            (col) =>
                ((col.columnDef as { meta?: ColumnMeta }).meta?.globalSearch ??
                    true) !== false,
        );
    const showSearch = showGlobalSearch && canSearchAnyColumn;
    const hasColumnFilters = table
        .getHeaderGroups()
        .at(-1)
        ?.headers.some((header) => header.column.getCanFilter());

    const normalizedActions = React.useMemo(
        () => React.Children.toArray(actions),
        [actions],
    );

    return (
        <div className="space-y-4">
            {showSearch || actions ? (
                <div className="flex items-center justify-between gap-2">
                    {showSearch ? (
                        <Input
                            placeholder="Search..."
                            value={globalFilter ?? ""}
                            onChange={(event) =>
                                handleFilterChange(event.target.value)
                            }
                            className="max-w-xs"
                        />
                    ) : (
                        <div />
                    )}
                    {normalizedActions}
                </div>
            ) : null}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="align-middle">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                        {showColumnFilters && hasColumnFilters ? (
                            <TableRow>
                                {table
                                    .getHeaderGroups()
                                    .at(-1)
                                    ?.headers.map((header) => (
                                        <TableHead
                                            key={`${header.column.id}-filter`}
                                            className="px-2 py-1">
                                            {header.column.getCanFilter() ? (
                                                <ColumnFilterCell
                                                    column={header.column}
                                                    meta={
                                                        (
                                                            header.column
                                                                .columnDef as {
                                                                meta?: ColumnMeta;
                                                            }
                                                        ).meta
                                                    }
                                                    table={table}
                                                />
                                            ) : null}
                                        </TableHead>
                                    ))}
                            </TableRow>
                        ) : null}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected()
                                            ? "selected"
                                            : undefined
                                    }>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className="align-middle">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-sm text-muted-foreground">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}>
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}>
                    Next
                </Button>
            </div>
        </div>
    );
}
