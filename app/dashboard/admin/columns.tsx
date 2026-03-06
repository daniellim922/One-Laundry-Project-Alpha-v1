"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AdminUserRow = {
    id: string;
    name: string;
    email: string;
    username: string | null;
    roles: string[];
    rolesDisplay: string; // for global search
    createdAt: Date;
};

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

export const columns: ColumnDef<AdminUserRow>[] = [
    {
        accessorKey: "name",
        header: sortableHeader("Name"),
    },
    {
        accessorKey: "email",
        header: sortableHeader("Email"),
    },
    {
        accessorKey: "username",
        header: sortableHeader("Username"),
        cell: ({ row }) => row.original.username ?? "—",
    },
    {
        accessorKey: "roles",
        header: sortableHeader("Roles"),
        cell: ({ row }) =>
            row.original.roles.length > 0
                ? row.original.roles.join(", ")
                : "—",
    },
];
