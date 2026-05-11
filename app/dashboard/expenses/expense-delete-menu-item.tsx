"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ExpenseDeleteMenuItem({
    expenseId,
    disabled,
}: {
    expenseId: string;
    disabled?: boolean;
}) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);

    return (
        <DropdownMenuItem
            disabled={disabled || pending}
            className={cn(
                "flex w-full items-center gap-2",
                !disabled && "text-destructive focus:text-destructive",
            )}
            onSelect={(e) => {
                e.preventDefault();
                setPending(true);
                void (async () => {
                    try {
                        const res = await fetch(`/api/expenses/${expenseId}`, {
                            method: "DELETE",
                        });
                        if (!res.ok) {
                            setPending(false);
                            return;
                        }
                        router.refresh();
                    } finally {
                        setPending(false);
                    }
                })();
            }}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {pending ? "Deleting…" : "Delete"}
        </DropdownMenuItem>
    );
}
