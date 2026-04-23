import { Suspense } from "react";

import { DashboardSectionCardSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { DashboardHomeLoader } from "./dashboard-home-loader";

export default function Page() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Dashboard Overview
                </h1>
                <p className="text-muted-foreground">
                    Quick access to your workspace
                </p>
            </div>

            <Suspense fallback={<DashboardSectionCardSkeleton />}>
                <DashboardHomeLoader />
            </Suspense>
        </div>
    );
}
