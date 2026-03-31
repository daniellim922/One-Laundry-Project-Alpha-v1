"use client";

import * as React from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type DataTableColumnMeta = {
    /** When true, this column participates in global search. */
    globalSearch?: boolean;
};

export type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<
    TData,
    TValue
> & {
    meta?: DataTableColumnMeta;
};

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

export function RowActionsMenu({
    label = "Open row actions",
    children,
}: {
    label?: string;
    children: React.ReactNode;
}) {
    return (
        <DropdownMenu>
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
    label,
    cell,
}: {
    label?: string;
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

export function createLinkCell<TData>({
    href,
    text,
    className = "hover:underline",
}: {
    href: (row: TData) => string;
    text: (row: TData) => React.ReactNode;
    className?: string;
}) {
    return ({ row }: { row: { original: TData } }) => (
        <Link href={href(row.original)} className={className}>
            {text(row.original)}
        </Link>
    );
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
    return ({ row }: { row: { original: TData } }) => (
        <Badge variant={variant} className={toneClassNameFor?.(row.original)}>
            {value(row.original)}
        </Badge>
    );
}

export function createDateCell<TData>({
    value,
    format,
}: {
    value: (row: TData) => string | Date;
    format: (d: string | Date) => string;
}) {
    return ({ row }: { row: { original: TData } }) =>
        format(value(row.original));
}

export function createMoneyCell<TData>({
    value,
    currency = "USD",
    locale = "en-US",
}: {
    value: (row: TData) => number;
    currency?: string;
    locale?: string;
}) {
    const fmt = new Intl.NumberFormat(locale, { style: "currency", currency });
    return ({ row }: { row: { original: TData } }) =>
        fmt.format(value(row.original));
}
