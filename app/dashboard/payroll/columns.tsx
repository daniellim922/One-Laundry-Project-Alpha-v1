"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectPayroll } from "@/db/tables/payrollsTable";
import Link from "next/link";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PayrollWithWorker = SelectPayroll & { workerName: string };

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
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

const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
    approved:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export const columns: ColumnDef<PayrollWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
    },
    {
        id: "period",
        header: sortableHeader("Period"),
        cell: ({ row }) => {
            const start = formatDate(row.original.periodStart);
            const end = formatDate(row.original.periodEnd);
            return `${start} – ${end}`;
        },
    },
    {
        accessorKey: "payrollDate",
        header: sortableHeader("Payroll Date"),
        cell: ({ row }) => formatDate(row.original.payrollDate),
    },
    {
        accessorKey: "totalHours",
        header: sortableHeader("Total Hours"),
        cell: ({ row }) =>
            row.original.totalHours != null
                ? Number(row.original.totalHours).toFixed(2)
                : "—",
    },
    {
        accessorKey: "totalPay",
        header: sortableHeader("Total Pay"),
        cell: ({ row }) =>
            row.original.totalPay != null
                ? `$${row.original.totalPay}`
                : "—",
    },
    {
        accessorKey: "status",
        header: sortableHeader("Status"),
        cell: ({ row }) => {
            const value = row.original.status;
            return (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusStyles[value ?? "draft"] ?? ""
                    }`}>
                    {value}
                </span>
            );
        },
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const payroll = row.original;
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
                                href={`/dashboard/payroll/${payroll.id}`}
                                className="w-full">
                                View
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
