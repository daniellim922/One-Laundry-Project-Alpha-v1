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
import { localDateDmy } from "@/lib/local-iso-date";
import {
    loanPaidToneClassName,
    StatusBadge,
} from "@/components/ui/status-badge";
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

export const columns: ColumnDef<AdvanceRequestWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
    },
    {
        accessorKey: "amountRequested",
        header: sortableHeader("Amount requested"),
        cell: ({ row }) => `$${row.original.amountRequested}`,
    },
    {
        accessorKey: "status",
        header: sortableHeader("Status"),
        cell: ({ row }) => (
            <StatusBadge
                label={row.original.status}
                toneClassName={loanPaidToneClassName[row.original.status]}
            />
        ),
    },
    {
        accessorKey: "requestDate",
        header: sortableHeader("Request date"),
        cell: ({ row }) => localDateDmy(row.original.requestDate),
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
                                href={`/dashboard/advance/${advanceRequest.id}`}
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
