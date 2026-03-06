"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SelectRole } from "@/db/tables/workersTable";
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

export const columns: ColumnDef<SelectRole>[] = [
    {
        accessorKey: "name",
        header: sortableHeader("Name"),
    },
    {
        accessorKey: "description",
        header: sortableHeader("Description"),
        cell: ({ row }) => row.original.description ?? "—",
    },
];
