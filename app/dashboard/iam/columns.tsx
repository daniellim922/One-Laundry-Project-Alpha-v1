"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Ban, MoreHorizontal, Pencil, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { banUser, unbanUser } from "./actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type IAMUserRow = {
    id: string;
    name: string;
    email: string;
    username: string | null;
    banned: boolean;
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

export const columns: ColumnDef<IAMUserRow>[] = [
    {
        accessorKey: "name",
        header: sortableHeader("Name"),
        cell: ({ row }) => (
            <span className="flex items-center gap-2">
                {row.original.name}
                {row.original.banned && (
                    <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs font-medium">
                        Banned
                    </span>
                )}
            </span>
        ),
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
        id: "actions",
        cell: ({ row }) => (
            <UserActionsCell user={row.original} />
        ),
    },
];

function UserActionsCell({ user }: { user: IAMUserRow }) {
    const router = useRouter();

    const handleBan = async () => {
        await banUser(user.id);
        router.refresh();
    };

    const handleUnban = async () => {
        await unbanUser(user.id);
        router.refresh();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/iam/users/edit/${user.id}`}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                    </Link>
                </DropdownMenuItem>
                {user.banned ? (
                    <DropdownMenuItem onClick={handleUnban}>
                        <ShieldOff className="mr-2 size-4" />
                        Unban
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        onClick={handleBan}
                        className="text-destructive focus:text-destructive">
                        <Ban className="mr-2 size-4" />
                        Ban
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
