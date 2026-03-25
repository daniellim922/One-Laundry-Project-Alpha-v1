"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTimesheetEntry } from "./actions";
import {
    formatTimesheetEntryStatus,
    timesheetEntryStatusPillClass,
    type TimesheetPaymentStatus,
} from "./timesheet-entry-status";
import { formatTimesheetRowDate, formatTimesheetRowTime } from "./timesheet-display-format";

export type TimesheetEntryWithWorker = {
    id: string;
    workerId: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
    hours: number;
    status: TimesheetPaymentStatus;
    workerName: string;
};

const sortableHeader =
    (label: string) =>
    ({
        column,
    }: {
        column: {
            toggleSorting: (asc: boolean) => void;
            getIsSorted: () => false | "asc" | "desc";
        };
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

function TimesheetRowActions({
    id,
    status,
}: {
    id: string;
    status: TimesheetPaymentStatus;
}) {
    const router = useRouter();
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const isPaid = status === "paid";

    async function handleDelete() {
        setError(null);
        setPending(true);
        const result = await deleteTimesheetEntry(id);
        setPending(false);
        if (result?.error) {
            setError(result.error);
            return;
        }
        setDeleteOpen(false);
        router.refresh();
    }

    return (
        <>
            <div className="flex justify-end">
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
                                href={`/dashboard/timesheet/${id}/view`}
                                className="flex w-full items-center gap-2">
                                <Eye className="h-4 w-4" />
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
                                    href={`/dashboard/timesheet/${id}/edit`}
                                    className="flex w-full items-center gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive flex w-full items-center gap-2"
                            onSelect={(e) => {
                                e.preventDefault();
                                setDeleteOpen(true);
                            }}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete timesheet entry?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={() => setDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={pending}
                            onClick={handleDelete}
                        >
                            {pending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export const columns: ColumnDef<TimesheetEntryWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
    },
    {
        accessorKey: "dateIn",
        header: sortableHeader("Date in"),
        cell: ({ row }) => formatTimesheetRowDate(row.original.dateIn),
    },
    {
        accessorKey: "dateOut",
        header: sortableHeader("Date out"),
        cell: ({ row }) => formatTimesheetRowDate(row.original.dateOut),
    },
    {
        accessorKey: "timeIn",
        header: sortableHeader("Time in"),
        cell: ({ row }) => formatTimesheetRowTime(row.original.timeIn),
    },
    {
        accessorKey: "timeOut",
        header: sortableHeader("Time out"),
        cell: ({ row }) => formatTimesheetRowTime(row.original.timeOut),
    },
    {
        id: "hours",
        header: sortableHeader("Hours"),
        enableColumnFilter: false,
        cell: ({ row }) => row.original.hours.toFixed(2),
    },
    {
        accessorKey: "status",
        header: sortableHeader("Status"),
        cell: ({ row }) => (
            <span className={timesheetEntryStatusPillClass(row.original.status)}>
                {formatTimesheetEntryStatus(row.original.status)}
            </span>
        ),
    },
    {
        id: "actions",
        header: "",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
            <TimesheetRowActions
                id={row.original.id}
                status={row.original.status}
            />
        ),
    },
];
