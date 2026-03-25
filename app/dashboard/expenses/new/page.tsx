import Link from "next/link";

import { requirePermission } from "@/lib/require-permission";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewExpensePage() {
    await requirePermission("Expenses", "create");
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/expenses/all">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        New expense
                    </h1>
                    <p className="text-muted-foreground">
                        Add a new expense. Form coming soon.
                    </p>
                </div>
            </div>
        </div>
    );
}
