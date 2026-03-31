"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectPayroll } from "@/db/tables/payroll/payrollTable";
import Link from "next/link";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
    createActionsColumn,
    createBadgeCell,
    createSortableHeader,
    RowActionsMenu,
} from "@/components/data-table/column-builders";

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
    settled:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export const columns: ColumnDef<PayrollWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: createSortableHeader("Worker"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "status",
        header: createSortableHeader("Status"),
        meta: { globalSearch: true },
        cell: createBadgeCell<PayrollWithWorker>({
            value: (r) => r.status ?? "draft",
            variant: "outline",
            toneClassNameFor: (r) => statusStyles[r.status ?? "draft"],
        }),
    },
    {
        accessorKey: "employmentType",
        header: createSortableHeader("Employment Type"),
        meta: { globalSearch: true },
        cell: createBadgeCell<PayrollWithWorker>({
            value: (r) => r.employmentType,
            variant: "outline",
            toneClassNameFor: (r) => employmentTypeStyles[r.employmentType],
        }),
    },
    {
        accessorKey: "employmentArrangement",
        header: createSortableHeader("Arrangement"),
        meta: { globalSearch: true },
        cell: createBadgeCell<PayrollWithWorker>({
            value: (r) => r.employmentArrangement,
            variant: "outline",
            toneClassNameFor: (r) => arrangementStyles[r.employmentArrangement],
        }),
    },
    {
        accessorKey: "periodStart",
        header: createSortableHeader("Period Start"),
        cell: ({ row }) => formatDate(row.original.periodStart),
    },
    {
        accessorKey: "periodEnd",
        header: createSortableHeader("Period End"),
        cell: ({ row }) => formatDate(row.original.periodEnd),
    },
    {
        accessorKey: "payrollDate",
        header: createSortableHeader("Payroll Date"),
        cell: ({ row }) => formatDate(row.original.payrollDate),
    },
    createActionsColumn<PayrollWithWorker>({
        cell: (payroll) => (
            <RowActionsMenu>
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/payroll/${payroll.id}/breakdown`} className="w-full">
                        View
                    </Link>
                </DropdownMenuItem>
            </RowActionsMenu>
        ),
    }),
];
