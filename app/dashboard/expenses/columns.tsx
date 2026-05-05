"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectExpense } from "@/db/tables/expensesTable";
import { createSortableHeader } from "@/components/data-table/column-builders";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";

export const columns: ColumnDef<SelectExpense>[] = [
    {
        accessorKey: "name",
        header: createSortableHeader("Name"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "grandTotalCents",
        header: createSortableHeader("Grand total"),
        cell: ({ row }) =>
            row.original.grandTotalCents != null
                ? `$${(row.original.grandTotalCents / 100).toFixed(2)}`
                : "—",
    },
    {
        accessorKey: "invoiceDate",
        header: createSortableHeader("Invoice date"),
        cell: ({ row }) =>
            formatEnGbDmyNumericFromCalendar(row.original.invoiceDate) || "—",
    },
    {
        accessorKey: "status",
        header: createSortableHeader("Status"),
        cell: ({ row }) => row.original.status,
    },
];
