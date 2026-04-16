import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { WorkerAllTableLoader } from "./worker-all-table-loader";

export default function Page() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All workers
                </h1>
                <p className="text-muted-foreground">
                    Manage and view your workers here.
                </p>
            </div>

            <Suspense
                fallback={
                    <DataTableSkeleton columnCount={10} rowCount={10} />
                }>
                <WorkerAllTableLoader />
            </Suspense>
        </div>
    );
}
