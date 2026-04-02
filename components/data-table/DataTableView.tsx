"use client";

import * as React from "react";
import type { Table as ReactTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type DataTableViewProps<TData> = {
    table: ReactTable<TData>;
    columnsCount: number;
    showSearch: boolean;
    globalFilter: string;
    onGlobalFilterChange: (value: string) => void;
    actions?: React.ReactNode;
};

export function DataTableView<TData>({
    table,
    columnsCount,
    showSearch,
    globalFilter,
    onGlobalFilterChange,
    actions,
}: DataTableViewProps<TData>) {
    return (
        <div className="space-y-4">
            {showSearch || actions ? (
                <div className="flex items-center justify-between gap-2">
                    {showSearch ? (
                        <Input
                            placeholder="Search..."
                            value={globalFilter ?? ""}
                            onChange={(event) =>
                                onGlobalFilterChange(event.target.value)
                            }
                            className="max-w-xs"
                        />
                    ) : (
                        <div />
                    )}
                    {actions}
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
                        <TableRow>
                            {table
                                .getHeaderGroups()
                                .at(-1)
                                ?.headers.map((header) => (
                                    <TableHead
                                        key={`${header.id}-filter`}
                                        className="px-2 py-1">
                                        {header.column.getCanFilter() ? (
                                            <Input
                                                placeholder="Filter..."
                                                value={
                                                    (header.column.getFilterValue() as string) ??
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    header.column.setFilterValue(
                                                        e.target.value ||
                                                            undefined,
                                                    )
                                                }
                                                className="h-8 text-xs"
                                            />
                                        ) : null}
                                    </TableHead>
                                ))}
                        </TableRow>
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
                                    colSpan={columnsCount}
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

