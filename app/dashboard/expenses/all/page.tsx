import Link from "next/link";
import { Suspense } from "react";

import { db } from "@/lib/db";
import { expensesTable } from "@/db/tables/expensesTable";
import { columns } from "../columns";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ExpensesAllPage() {
    const expenses = await db.select().from(expensesTable);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All expenses
                </h1>
                <p className="text-muted-foreground">
                    View and manage your expenses here.
                </p>
            </div>

            <Suspense fallback={<DataTableSkeleton />}>
                <DataTable
                    columns={columns}
                    data={expenses}
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
