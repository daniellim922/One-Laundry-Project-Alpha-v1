"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function ExpenseMarkPaidMenuItem({
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
            className="flex w-full items-center gap-2"
            onSelect={(e) => {
                e.preventDefault();
                setPending(true);
                void (async () => {
                    try {
                        const res = await fetch(
                            `/api/expenses/${expenseId}/status`,
                            {
                                method: "PATCH",
                                headers: {
                                    "content-type": "application/json",
                                },
                                body: JSON.stringify({
                                    status: "Expense Paid",
                                }),
                            },
                        );
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
            {pending ? "Marking paid…" : "Mark paid"}
        </DropdownMenuItem>
    );
}
