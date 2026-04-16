import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { AdvanceAllTableLoader } from "./advance-all-table-loader";

export default function AdvanceAllPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2
                    className="text-2xl font-semibold tracking-tight"
                    data-testid="advance-list-heading">
                    All advances
                </h2>
                <p className="text-muted-foreground">
                    All advance requests across workers.
                </p>
            </div>

            <Suspense
                fallback={
                    <DataTableSkeleton columnCount={5} rowCount={10} />
                }>
                <AdvanceAllTableLoader />
            </Suspense>
        </div>
    );
}
