"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateHoursFromTimes } from "@/lib/payroll-utils";

export type TimesheetEntryWithWorker = {
    id: string;
    workerId: string;
    date: string;
    timeIn: string;
    timeOut: string;
    workerName: string;
};

function formatDate(d: string): string {
    return new Date(d + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
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

export const columns: ColumnDef<TimesheetEntryWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
    },
    {
        accessorKey: "date",
        header: sortableHeader("Date"),
        cell: ({ row }) => formatDate(row.original.date),
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
        cell: ({ row }) => {
            const hours = calculateHoursFromTimes(
                row.original.timeIn,
                row.original.timeOut,
            );
            return hours.toFixed(2);
        },
    },
];
