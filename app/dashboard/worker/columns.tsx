"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { WorkerWithEmployment } from "@/db/tables/payroll/workerTable";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
    createActionsColumn,
    createBadgeCell,
    createSortableHeader,
    RowActionsMenu,
} from "@/components/data-table/column-builders";

const statusStyles: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    Inactive: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

const employmentTypeStyles: Record<
    WorkerWithEmployment["employmentType"],
    string
> = {
    "Full Time":
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    "Part Time": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
};

const employmentArrangementStyles: Record<
    WorkerWithEmployment["employmentArrangement"],
    string
> = {
    "Foreign Worker":
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    "Local Worker":
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

const paymentMethodStyles: Record<
    NonNullable<WorkerWithEmployment["paymentMethod"]>,
    string
> = {
    PayNow: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    "Bank Transfer":
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
    Cash: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
};

export const columns: ColumnDef<WorkerWithEmployment>[] = [
    {
        accessorKey: "name",
        header: createSortableHeader("Name"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "nric",
        header: createSortableHeader("NRIC"),
        meta: { globalSearch: true },
        cell: ({ row }) => row.original.nric ?? "—",
    },
    {
        accessorKey: "status",
        header: createSortableHeader("Status"),
        meta: { globalSearch: true },
        cell: createBadgeCell<WorkerWithEmployment>({
            value: (r) => r.status,
            variant: "outline",
            toneClassNameFor: (r) => statusStyles[r.status],
        }),
    },
    {
        accessorKey: "employmentType",
        header: createSortableHeader("Employment Type"),
        meta: { globalSearch: true },
        cell: createBadgeCell<WorkerWithEmployment>({
            value: (r) => r.employmentType,
            variant: "outline",
            toneClassNameFor: (r) => employmentTypeStyles[r.employmentType],
        }),
    },
    {
        accessorKey: "employmentArrangement",
        header: createSortableHeader("Employment Arrangement"),
        meta: { globalSearch: true },
        cell: createBadgeCell<WorkerWithEmployment>({
            value: (r) => r.employmentArrangement,
            variant: "outline",
            toneClassNameFor: (r) =>
                employmentArrangementStyles[r.employmentArrangement],
        }),
    },
    {
        accessorKey: "phone",
        header: createSortableHeader("Phone"),
        meta: { globalSearch: true },
        cell: ({ row }) => row.original.phone ?? "—",
    },
    {
        accessorKey: "monthlyPay",
        header: createSortableHeader("Monthly Pay"),
        cell: ({ row }) =>
            row.original.monthlyPay != null ? `$${row.original.monthlyPay}` : "—",
    },
    {
        accessorKey: "hourlyRate",
        header: createSortableHeader("Hourly Rate"),
        cell: ({ row }) =>
            row.original.hourlyRate != null ? `$${row.original.hourlyRate}` : "—",
    },
    {
        accessorKey: "paymentMethod",
        header: createSortableHeader("Payment Method"),
        meta: { globalSearch: true },
        cell: ({ row }) => {
            const value = row.original.paymentMethod;
            if (!value) return "—";
            const badgeCell = createBadgeCell<WorkerWithEmployment>({
                value: (r) => r.paymentMethod ?? "—",
                variant: "outline",
                toneClassNameFor: (r) =>
                    r.paymentMethod
                        ? paymentMethodStyles[r.paymentMethod]
                        : undefined,
            });
            return badgeCell({ row });
        },
    },
    createActionsColumn<WorkerWithEmployment>({
        cell: (worker) => (
            <RowActionsMenu>
                <DropdownMenuItem asChild>
                    <Link
                        href={`/dashboard/worker/${worker.id}/view`}
                        className="flex w-full items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        href={`/dashboard/worker/${worker.id}/edit`}
                        className="flex w-full items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Link>
                </DropdownMenuItem>
            </RowActionsMenu>
        ),
    }),
];
