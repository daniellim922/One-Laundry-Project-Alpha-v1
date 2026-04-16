import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { TimesheetAllTableLoader } from "./timesheet-all-table-loader";

export default function TimesheetAllPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All timesheets
                </h1>
                <p className="text-muted-foreground">
                    View all clock-in and clock-out records
                </p>
            </div>

            <Suspense
                fallback={
                    <DataTableSkeleton columnCount={8} rowCount={10} />
                }>
                <TimesheetAllTableLoader />
            </Suspense>
        </div>
    );
}
