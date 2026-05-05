import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { ExpensesAllTableLoader } from "./expenses-all-table-loader";

export default async function ExpensesAllPage() {
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

            <Suspense
                fallback={
                    <DataTableSkeleton columnCount={9} rowCount={10} />
                }>
                <ExpensesAllTableLoader />
            </Suspense>
        </div>
    );
}
