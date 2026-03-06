import Link from "next/link";
import { Suspense } from "react";

import { db } from "@/lib/db";
import { expensesTable, type SelectExpense } from "@/db/tables/expensesTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function Page() {
    const expenses: SelectExpense[] = await db.select().from(expensesTable);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Expenses
                </h1>
                <p className="text-muted-foreground">
                    View and manage your expenses here.
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Loading...
                    </div>
                }>
                <DataTable
                    columns={columns}
                    data={expenses}
                    searchKey="description"
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/expenses/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add expense
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
