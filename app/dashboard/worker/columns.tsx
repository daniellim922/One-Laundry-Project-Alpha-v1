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
import {
    employmentArrangementBadgeTone,
    employmentTypeBadgeTone,
    workerPaymentMethodBadgeTone,
    workerStatusBadgeTone,
} from "@/types/badge-tones";

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
            toneClassNameFor: (r) => workerStatusBadgeTone[r.status],
        }),
    },
    {
        accessorKey: "employmentType",
        header: createSortableHeader("Employment Type"),
        meta: { globalSearch: true },
        cell: createBadgeCell<WorkerWithEmployment>({
            value: (r) => r.employmentType,
            variant: "outline",
            toneClassNameFor: (r) => employmentTypeBadgeTone[r.employmentType],
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
                employmentArrangementBadgeTone[r.employmentArrangement],
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
        cell: createBadgeCell<WorkerWithEmployment>({
            value: (r) => r.paymentMethod ?? "—",
            variant: "outline",
            toneClassNameFor: (r) =>
                r.paymentMethod
                    ? workerPaymentMethodBadgeTone[r.paymentMethod]
                    : undefined,
        }),
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
