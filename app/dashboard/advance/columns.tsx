"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    advanceDetailPath,
    advanceRequestStatusBadgeClass,
    formatAdvanceAmount,
    formatAdvanceDate,
} from "@/app/dashboard/advance/_presentation/advance-display";
import type { AdvanceRequestWithWorker } from "@/lib/advances-queries";

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

export const columns: ColumnDef<AdvanceRequestWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
    },
    {
        accessorKey: "amountRequested",
        header: sortableHeader("Amount requested"),
        cell: ({ row }) => formatAdvanceAmount(row.original.amountRequested),
    },
    {
        accessorKey: "status",
        header: sortableHeader("Status"),
        cell: ({ row }) => {
            const value = row.original.status;
            return (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        advanceRequestStatusBadgeClass[value] ?? ""
                    }`}>
                    {value}
                </span>
            );
        },
    },
    {
        accessorKey: "requestDate",
        header: sortableHeader("Request date"),
        cell: ({ row }) => formatAdvanceDate(row.original.requestDate),
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const advanceRequest = row.original;
            const isPaid = advanceRequest.status === "paid";
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
                                href={advanceDetailPath(advanceRequest.id)}
                                className="flex w-full items-center gap-2">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </Link>
                        </DropdownMenuItem>
                        {isPaid ? (
                            <DropdownMenuItem
                                disabled
                                className="flex w-full items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/dashboard/advance/${advanceRequest.id}/edit`}
                                    className="flex w-full items-center gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
