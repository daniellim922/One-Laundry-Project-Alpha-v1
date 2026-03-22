"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowUpDown, Eye, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    advanceDetailPath,
    advanceStatusBadgeClass,
    formatAdvanceAmount,
    formatAdvanceDate,
} from "@/lib/advance-display";
import type { AdvanceWithWorker } from "@/lib/advances-queries";

function sortableHeader(label: string) {
    const Header = <TData, TValue>({
        column,
    }: {
        column: Column<TData, TValue>;
    }) => (
        <Button
            variant="ghost"
            className="px-0 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            {label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    );

    Header.displayName = `SortableHeader(${label})`;
    return Header;
}

export const columns: ColumnDef<AdvanceWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
    },
    {
        accessorKey: "amount",
        header: sortableHeader("Amount"),
        cell: ({ row }) => formatAdvanceAmount(row.original.amount),
    },
    {
        accessorKey: "status",
        header: sortableHeader("Status"),
        cell: ({ row }) => {
            const value = row.original.status;
            return (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        advanceStatusBadgeClass[value] ?? ""
                    }`}>
                    {value}
                </span>
            );
        },
    },
    {
        accessorKey: "loanDate",
        header: sortableHeader("Loan date"),
        cell: ({ row }) => formatAdvanceDate(row.original.loanDate),
    },
    {
        accessorKey: "repaymentDate",
        header: sortableHeader("Repayment date"),
        cell: ({ row }) =>
            row.original.repaymentDate
                ? formatAdvanceDate(row.original.repaymentDate)
                : "—",
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const advance = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label="Open row actions">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link
                                href={advanceDetailPath(advance.id)}
                                className="flex w-full items-center gap-2">
                                <Eye className="h-4 w-4" />
                                View
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
