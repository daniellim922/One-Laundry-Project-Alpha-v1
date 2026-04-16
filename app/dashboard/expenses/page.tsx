import { Suspense } from "react";

import { DashboardHubOverviewSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { ExpensesOverviewLoader } from "./expenses-overview-loader";

export default function ExpensesOverviewPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Expenses
                </h1>
                <p className="text-muted-foreground">
                    Overview of spending and quick actions
                </p>
            </div>

            <Suspense
                fallback={<DashboardHubOverviewSkeleton buttonSlots={2} />}>
                <ExpensesOverviewLoader />
            </Suspense>
        </div>
    );
}
