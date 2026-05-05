"use client";

import * as React from "react";
import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ExpenseDetailRevertSubmitted({
    expenseId,
}: {
    expenseId: string;
}) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);

    return (
        <Button
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2"
            disabled={pending}
            onClick={() => {
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
                                    status: "Expense Submitted",
                                }),
                            },
                        );
                        if (res.ok) {
                            router.refresh();
                        }
                    } finally {
                        setPending(false);
                    }
                })();
            }}>
            <Undo2 className="h-4 w-4" aria-hidden />
            {pending ? "Reverting…" : "Revert to Submitted"}
        </Button>
    );
}
