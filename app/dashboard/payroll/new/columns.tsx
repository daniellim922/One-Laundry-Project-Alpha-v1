"use client";

import type { ColumnDef } from "@tanstack/react-table";

import {
    createRowSelectionColumn,
    createBadgeCell,
    createSortableHeader,
} from "@/components/data-table/column-builders";
import {
    employmentArrangementBadgeTone,
    employmentTypeBadgeTone,
    workerStatusBadgeTone,
} from "@/types/badge-tones";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerStatus,
} from "@/types/status";

export type WorkerForPayrollSelection = {
    id: string;
    name: string;
    status: WorkerStatus;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
};

export const columns: ColumnDef<WorkerForPayrollSelection>[] = [
    createRowSelectionColumn<WorkerForPayrollSelection>({
        ariaLabelForRow: (w) => `Select ${w.name}`,
    }),
    {
        accessorKey: "name",
        header: createSortableHeader("Worker"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "employmentArrangement",
        header: createSortableHeader("Arrangement"),
        cell: createBadgeCell<WorkerForPayrollSelection>({
            value: (r) => r.employmentArrangement,
            variant: "outline",
            toneClassNameFor: (r) =>
                employmentArrangementBadgeTone[r.employmentArrangement],
        }),
    },
    {
        accessorKey: "employmentType",
        header: createSortableHeader("Type"),
        cell: createBadgeCell<WorkerForPayrollSelection>({
            value: (r) => r.employmentType,
            variant: "outline",
            toneClassNameFor: (r) => employmentTypeBadgeTone[r.employmentType],
        }),
    },
    {
        accessorKey: "status",
        header: createSortableHeader("Status"),
        enableSorting: false,
        enableColumnFilter: false,
        cell: createBadgeCell<WorkerForPayrollSelection>({
            value: (r) => r.status,
            variant: "outline",
            toneClassNameFor: (r) => workerStatusBadgeTone[r.status],
        }),
    },
];

