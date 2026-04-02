"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import {
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { localDateDmy } from "@/utils/time/local-iso-date";
import { loanPaidToneClassName } from "@/types/badge-tones";
import type { AdvanceRequestWithWorker } from "@/utils/advance/queries";
import {
    createActionsColumn,
    createBadgeCell,
    createSortableHeader,
    RowActionsMenu,
} from "@/components/data-table/column-builders";

export const columns: ColumnDef<AdvanceRequestWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: createSortableHeader("Worker"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "amountRequested",
        header: createSortableHeader("Amount requested"),
        cell: ({ row }) => `$${row.original.amountRequested}`,
    },
    {
        accessorKey: "status",
        header: createSortableHeader("Status"),
        meta: { globalSearch: true },
        cell: createBadgeCell<AdvanceRequestWithWorker>({
            value: (r) => r.status,
            variant: "outline",
            toneClassNameFor: (r) => loanPaidToneClassName[r.status],
        }),
    },
    {
        accessorKey: "requestDate",
        header: createSortableHeader("Request date"),
        cell: ({ row }) => localDateDmy(row.original.requestDate),
    },
    createActionsColumn<AdvanceRequestWithWorker>({
        cell: (advanceRequest) => {
            const isPaid = advanceRequest.status === "paid";
            return (
                <RowActionsMenu>
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
                </RowActionsMenu>
            );
        },
    }),
];
