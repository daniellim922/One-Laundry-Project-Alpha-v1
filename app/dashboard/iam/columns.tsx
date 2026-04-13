"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Pencil, ShieldOff } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
    createActionsColumn,
    createSortableHeader,
    RowActionsMenu,
} from "@/components/data-table/column-builders";
import { updateIamUserStatus } from "./user-status-client";

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

export const columns: ColumnDef<IAMUserRow>[] = [
    {
        accessorKey: "name",
        header: createSortableHeader("Name"),
        meta: { globalSearch: true },
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
        header: createSortableHeader("Email"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "username",
        header: createSortableHeader("Username"),
        meta: { globalSearch: true },
        cell: ({ row }) => row.original.username ?? "—",
    },
    createActionsColumn<IAMUserRow>({
        cell: (user) => <UserActionsCell user={user} />,
    }),
];

function UserActionsCell({ user }: { user: IAMUserRow }) {
    const router = useRouter();

    const handleBan = async () => {
        await updateIamUserStatus({
            userId: user.id,
            banned: true,
        });
        router.refresh();
    };

    const handleUnban = async () => {
        await updateIamUserStatus({
            userId: user.id,
            banned: false,
        });
        router.refresh();
    };

    return (
        <RowActionsMenu>
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
        </RowActionsMenu>
    );
}
