"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectExpense } from "@/db/tables/workersTable";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export const columns: ColumnDef<SelectExpense>[] = [
    {
        accessorKey: "description",
        header: sortableHeader("Description"),
    },
    {
        accessorKey: "amount",
        header: sortableHeader("Amount"),
        cell: ({ row }) =>
            row.original.amount != null
                ? `$${(row.original.amount / 100).toFixed(2)}`
                : "—",
    },
    {
        accessorKey: "category",
        header: sortableHeader("Category"),
        cell: ({ row }) => row.original.category ?? "—",
    },
    {
        accessorKey: "date",
        header: sortableHeader("Date"),
        cell: ({ row }) =>
            row.original.date instanceof Date
                ? row.original.date.toLocaleDateString()
                : new Date(row.original.date).toLocaleDateString(),
    },
];
