import { Suspense } from "react";

import { DashboardHubOverviewSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { PayrollOverviewLoader } from "@/app/dashboard/payroll/payroll-overview-loader";

export default function PayrollOverviewPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Payroll
                </h1>
                <p className="text-muted-foreground">
                    Overview of payroll runs and quick actions
                </p>
            </div>

            <Suspense
                fallback={<DashboardHubOverviewSkeleton buttonSlots={4} />}>
                <PayrollOverviewLoader />
            </Suspense>
        </div>
    );
}
