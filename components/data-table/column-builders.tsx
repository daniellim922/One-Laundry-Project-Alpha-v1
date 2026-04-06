"use client";

import * as React from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export function createSortableHeader(label: string) {
    const Header = <TData, TValue>({
        column,
    }: {
        column: Column<TData, TValue>;
    }) => (
        <Button
            type="button"
            variant="ghost"
            className="px-0 font-semibold"
            onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
            }>
            {label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    );

    Header.displayName = `SortableHeader(${label})`;
    return Header;
}

export function createRowSelectionColumn<TData>({
    ariaLabelForRow,
}: {
    ariaLabelForRow?: (row: TData) => string;
}): ColumnDef<TData> {
    return {
        id: "select",
        enableSorting: false,
        enableColumnFilter: false,
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllRowsSelected()
                        ? true
                        : table.getIsSomeRowsSelected()
                          ? "indeterminate"
                          : false
                }
                onCheckedChange={(checked) =>
                    table.toggleAllRowsSelected(!!checked)
                }
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(checked) => row.toggleSelected(!!checked)}
                aria-label={
                    ariaLabelForRow
                        ? ariaLabelForRow(row.original)
                        : "Select row"
                }
            />
        ),
        meta: { globalSearch: false },
    };
}

export function RowActionsMenu({
    label = "Open row actions",
    modal = true,
    children,
}: {
    label?: string;
    modal?: boolean;
    children: React.ReactNode;
}) {
    return (
        <DropdownMenu modal={modal}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={label}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{children}</DropdownMenuContent>
        </DropdownMenu>
    );
}

export function createActionsColumn<TData>({
    cell,
}: {
    cell: (row: TData) => React.ReactNode;
}): ColumnDef<TData> {
    return {
        id: "actions",
        header: "",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => <>{cell(row.original)}</>,
        meta: { globalSearch: false },
    };
}

export function createBadgeCell<TData>({
    value,
    variant = "outline",
    toneClassNameFor,
}: {
    value: (row: TData) => React.ReactNode;
    variant?: React.ComponentProps<typeof Badge>["variant"];
    toneClassNameFor?: (row: TData) => string | undefined;
}) {
    const BadgeCell = ({ row }: { row: { original: TData } }) => (
        <Badge variant={variant} className={toneClassNameFor?.(row.original)}>
            {value(row.original)}
        </Badge>
    );
    BadgeCell.displayName = "BadgeCell";
    return BadgeCell;
}
