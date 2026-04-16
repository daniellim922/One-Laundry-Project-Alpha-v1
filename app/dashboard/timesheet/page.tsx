import { Suspense } from "react";

import { DashboardHubOverviewSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { TimesheetOverviewLoader } from "./timesheet-overview-loader";

export default function TimesheetOverviewPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Timesheet
                </h1>
                <p className="text-muted-foreground">
                    Overview of entries and quick actions
                </p>
            </div>

            <Suspense
                fallback={<DashboardHubOverviewSkeleton buttonSlots={3} />}>
                <TimesheetOverviewLoader />
            </Suspense>
        </div>
    );
}
