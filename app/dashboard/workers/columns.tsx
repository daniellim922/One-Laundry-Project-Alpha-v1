"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectWorker } from "@/db/tables/payroll/workerTable";
import Link from "next/link";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sortableHeader =
    (label: string) =>
    ({ column }: { column: any }) => (
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
    Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    Inactive: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

const employmentTypeStyles: Record<SelectWorker["employmentType"], string> = {
    "Full Time":
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    "Part Time": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
};

const employmentArrangementStyles: Record<
    SelectWorker["employmentArrangement"],
    string
> = {
    "Foreign Worker":
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    "Local Worker":
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

const paymentMethodStyles: Record<
    NonNullable<SelectWorker["paymentMethod"]>,
    string
> = {
    PayNow: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    "Bank Transfer":
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
    Cash: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
};

export const columns: ColumnDef<SelectWorker>[] = [
    {
        accessorKey: "name",
        header: sortableHeader("Name"),
    },
    {
        accessorKey: "status",
        header: sortableHeader("Status"),
        cell: ({ row }) => {
            const value = row.original.status;
            return (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusStyles[value] ?? ""
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
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${employmentTypeStyles[value] ?? ""}`}>
                    {value}
                </span>
            );
        },
    },
    {
        accessorKey: "employmentArrangement",
        header: sortableHeader("Employment Arrangement"),
        cell: ({ row }) => {
            const value = row.original.employmentArrangement;
            return (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${employmentArrangementStyles[value] ?? ""}`}>
                    {value}
                </span>
            );
        },
    },
    {
        accessorKey: "countryOfOrigin",
        header: sortableHeader("Country of Origin"),
        cell: ({ row }) => row.original.countryOfOrigin ?? "—",
    },
    {
        accessorKey: "monthlyPay",
        header: sortableHeader("Monthly Pay"),
        cell: ({ row }) =>
            row.original.monthlyPay != null
                ? `$${row.original.monthlyPay}`
                : "—",
    },
    {
        accessorKey: "hourlyPay",
        header: sortableHeader("Hourly Pay"),
        cell: ({ row }) =>
            row.original.hourlyPay != null ? `$${row.original.hourlyPay}` : "—",
    },
    {
        accessorKey: "paymentMethod",
        header: sortableHeader("Payment Method"),
        cell: ({ row }) => {
            const value = row.original.paymentMethod;
            if (!value) return "—";
            return (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentMethodStyles[value] ?? ""}`}>
                    {value}
                </span>
            );
        },
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const worker = row.original;

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
                                href={`/dashboard/workers/${worker.id}/view`}
                                className="flex w-full items-center gap-2">
                                <Eye className="h-4 w-4" />
                                View
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link
                                href={`/dashboard/workers/${worker.id}/edit`}
                                className="flex w-full items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
