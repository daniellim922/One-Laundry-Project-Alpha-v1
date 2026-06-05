"use client";

import Link from "next/link";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
    workerId: string;
};

export function WorkerActionsMenu({ workerId }: Props) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label="Worker actions">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link
                        href={`/dashboard/worker/${workerId}/view`}
                        className="flex w-full items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        href={`/dashboard/worker/${workerId}/edit`}
                        className="flex w-full items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
