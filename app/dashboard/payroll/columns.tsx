"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectPayroll } from "@/db/tables/payroll/payrollTable";
import Link from "next/link";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PayrollWithWorker = SelectPayroll & {
    workerName: string;
    employmentType: string;
    employmentArrangement: string;
};

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
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

const employmentTypeStyles: Record<string, string> = {
    "Full Time":
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    "Part Time":
        "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
};

const arrangementStyles: Record<string, string> = {
    "Foreign Worker":
        "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    "Local Worker":
        "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300",
};

const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export const columns: ColumnDef<PayrollWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: sortableHeader("Worker"),
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
        accessorKey: "employmentType",
        header: sortableHeader("Employment Type"),
        cell: ({ row }) => {
            const value = row.original.employmentType;
            return (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        employmentTypeStyles[value] ?? ""
                    }`}>
                    {value}
                </span>
            );
        },
    },
    {
        accessorKey: "employmentArrangement",
        header: sortableHeader("Arrangement"),
        cell: ({ row }) => {
            const value = row.original.employmentArrangement;
            return (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        arrangementStyles[value] ?? ""
                    }`}>
                    {value}
                </span>
            );
        },
    },
    {
        accessorKey: "periodStart",
        header: sortableHeader("Period Start"),
        cell: ({ row }) => formatDate(row.original.periodStart),
    },
    {
        accessorKey: "periodEnd",
        header: sortableHeader("Period End"),
        cell: ({ row }) => formatDate(row.original.periodEnd),
    },
    {
        accessorKey: "payrollDate",
        header: sortableHeader("Payroll Date"),
        cell: ({ row }) => formatDate(row.original.payrollDate),
    },
    {
        id: "actions",
        header: "",
        enableColumnFilter: false,
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
                                href={`/dashboard/payroll/${payroll.id}/breakdown`}
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
