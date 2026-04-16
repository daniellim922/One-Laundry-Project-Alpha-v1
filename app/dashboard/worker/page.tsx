import { Suspense } from "react";

import { DashboardHubOverviewSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { WorkerOverviewLoader } from "./worker-overview-loader";

export default function WorkerOverviewPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Worker</h1>
                <p className="text-muted-foreground">
                    Overview of your workforce and quick actions
                </p>
            </div>

            <Suspense
                fallback={<DashboardHubOverviewSkeleton buttonSlots={3} />}>
                <WorkerOverviewLoader />
            </Suspense>
        </div>
    );
}
