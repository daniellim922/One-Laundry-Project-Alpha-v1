import { Suspense } from "react";

import { DashboardHubOverviewSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { AdvanceOverviewLoader } from "./advance-overview-loader";

export default function AdvanceOverviewPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Advance
                </h1>
                <p className="text-muted-foreground">
                    Salary advances overview and quick actions
                </p>
            </div>

            <Suspense
                fallback={<DashboardHubOverviewSkeleton buttonSlots={2} />}>
                <AdvanceOverviewLoader />
            </Suspense>
        </div>
    );
}
