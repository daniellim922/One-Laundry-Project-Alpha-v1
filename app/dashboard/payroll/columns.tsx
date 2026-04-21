"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectPayroll } from "@/db/tables/payrollTable";
import Link from "next/link";
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
    payrollStatusBadgeTone,
} from "@/types/badge-tones";
import type {
    PayrollStatus,
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
} from "@/types/status";
import { Eye } from "lucide-react";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";

export type PayrollWithWorker = SelectPayroll & {
    workerName: string;
    status: PayrollStatus;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    voucherNumber: number | null;
};

export const columns: ColumnDef<PayrollWithWorker>[] = [
    {
        accessorKey: "voucherNumber",
        header: createSortableHeader("Voucher #"),
        meta: { globalSearch: true },
        cell: ({ row }) => row.original.voucherNumber ?? "—",
    },
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
            value: (r) => r.status,
            variant: "outline",
            toneClassNameFor: (r) => payrollStatusBadgeTone[r.status],
        }),
    },
    {
        accessorKey: "payrollDate",
        header: createSortableHeader("Payroll Date"),
        cell: ({ row }) => formatEnGbDmyNumericFromCalendar(row.original.payrollDate),
    },
    {
        accessorKey: "periodStart",
        header: createSortableHeader("Period Start"),
        cell: ({ row }) => formatEnGbDmyNumericFromCalendar(row.original.periodStart),
    },
    {
        accessorKey: "periodEnd",
        header: createSortableHeader("Period End"),
        cell: ({ row }) => formatEnGbDmyNumericFromCalendar(row.original.periodEnd),
    },
    {
        accessorKey: "employmentType",
        header: createSortableHeader("Employment Type"),
        meta: { globalSearch: true },
        cell: createBadgeCell<PayrollWithWorker>({
            value: (r) => r.employmentType,
            variant: "outline",
            toneClassNameFor: (r) => employmentTypeBadgeTone[r.employmentType],
        }),
    },
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
    createActionsColumn<PayrollWithWorker>({
        cell: (payroll) => (
            <RowActionsMenu
                modal={false}
                contentProps={{ side: "top", align: "end" }}>
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
