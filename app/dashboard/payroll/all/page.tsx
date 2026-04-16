import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { PayrollAllTableLoader } from "./payroll-all-table-loader";

export default function PayrollAllPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All payrolls
                </h1>
                <p className="text-muted-foreground">
                    View and manage your payroll records.
                </p>
            </div>

            <Suspense
                fallback={
                    <DataTableSkeleton columnCount={8} rowCount={10} />
                }>
                <PayrollAllTableLoader />
            </Suspense>
        </div>
    );
}
