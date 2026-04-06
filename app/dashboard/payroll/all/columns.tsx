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
    withMultiSelectColumnFilter,
} from "@/components/data-table/column-builders";
import {
    employmentArrangementBadgeTone,
    employmentTypeBadgeTone,
    payrollStatusBadgeTone,
} from "@/types/badge-tones";
import type {
    PayrollStatus,
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
} from "@/types/status";
import { Eye, Pencil } from "lucide-react";

export type PayrollWithWorker = SelectPayroll & {
    workerName: string;
    status: PayrollStatus | null;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
};

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export const columns: ColumnDef<PayrollWithWorker>[] = [
    {
        accessorKey: "workerName",
        header: createSortableHeader("Worker"),
        meta: { globalSearch: true },
    },
    withMultiSelectColumnFilter<PayrollWithWorker>(
        {
            accessorKey: "status",
            header: createSortableHeader("Status"),
            meta: { globalSearch: true },
            cell: createBadgeCell<PayrollWithWorker>({
                value: (r) => r.status ?? "draft",
                variant: "outline",
                toneClassNameFor: (r) =>
                    payrollStatusBadgeTone[r.status ?? "draft"],
            }),
        },
        {
            options: "auto",
            placeholder: "Status…",
            searchPlaceholder: "Search status…",
        },
    ),
    withMultiSelectColumnFilter<PayrollWithWorker>(
        {
            accessorKey: "employmentType",
            header: createSortableHeader("Employment Type"),
            meta: { globalSearch: true },
            cell: createBadgeCell<PayrollWithWorker>({
                value: (r) => r.employmentType,
                variant: "outline",
                toneClassNameFor: (r) =>
                    employmentTypeBadgeTone[r.employmentType],
            }),
        },
        {
            options: "auto",
            placeholder: "Employment type…",
            searchPlaceholder: "Search employment type…",
        },
    ),
    withMultiSelectColumnFilter<PayrollWithWorker>(
        {
            accessorKey: "employmentArrangement",
            header: createSortableHeader("Arrangement"),
            meta: { globalSearch: true },
            cell: createBadgeCell<PayrollWithWorker>({
                value: (r) => r.employmentArrangement,
                variant: "outline",
                toneClassNameFor: (r) =>
                    employmentArrangementBadgeTone[r.employmentArrangement],
            }),
        },
        {
            options: "auto",
            placeholder: "Arrangement…",
            searchPlaceholder: "Search arrangement…",
        },
    ),
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
            <RowActionsMenu modal={false}>
                <DropdownMenuItem asChild>
                    <Link
                        href={`/dashboard/payroll/${payroll.id}/breakdown`}
                        className="w-full">
                        <Eye className="h-4 w-4" />
                        View
                    </Link>
                </DropdownMenuItem>
            </RowActionsMenu>
        ),
    }),
];
