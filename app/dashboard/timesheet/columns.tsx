"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTimesheetEntry } from "./actions";

export type TimesheetEntryWithWorker = {
    id: string;
    workerId: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
    hours: number;
    workerName: string;
};

function formatDate(d: string): string {
    return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function formatTime(t: string): string {
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
}

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

function TimesheetRowActions({ id }: { id: string }) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    async function handleDelete() {
        setError(null);
        setPending(true);
        const result = await deleteTimesheetEntry(id);
        setPending(false);
        if (result?.error) {
            setError(result.error);
            return;
        }
        setOpen(false);
        router.refresh();
    }

    return (
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/timesheet/${id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                </Link>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                    </Button>
                </DialogTrigger>
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
                            onClick={() => setOpen(false)}
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
        </div>
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
        cell: ({ row }) => formatDate(row.original.dateIn),
    },
    {
        accessorKey: "dateOut",
        header: sortableHeader("Date out"),
        cell: ({ row }) => formatDate(row.original.dateOut),
    },
    {
        accessorKey: "timeIn",
        header: sortableHeader("Time in"),
        cell: ({ row }) => formatTime(row.original.timeIn),
    },
    {
        accessorKey: "timeOut",
        header: sortableHeader("Time out"),
        cell: ({ row }) => formatTime(row.original.timeOut),
    },
    {
        id: "hours",
        header: sortableHeader("Hours"),
        cell: ({ row }) => row.original.hours.toFixed(2),
    },
    {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        enableSorting: false,
        cell: ({ row }) => <TimesheetRowActions id={row.original.id} />,
    },
];
