"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectExpense } from "@/db/expensesTable";
import { createSortableHeader } from "@/components/data-table/column-builders";

export const columns: ColumnDef<SelectExpense>[] = [
    {
        accessorKey: "description",
        header: createSortableHeader("Description"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "amount",
        header: createSortableHeader("Amount"),
        cell: ({ row }) =>
            row.original.amount != null
                ? `$${(row.original.amount / 100).toFixed(2)}`
                : "—",
    },
    {
        accessorKey: "category",
        header: createSortableHeader("Category"),
        meta: { globalSearch: true },
        cell: ({ row }) => row.original.category ?? "—",
    },
    {
        accessorKey: "date",
        header: createSortableHeader("Date"),
        cell: ({ row }) => {
            const d =
                row.original.date instanceof Date
                    ? row.original.date
                    : new Date(row.original.date);
            return d.toLocaleDateString("en-CA", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
        },
    },
];
