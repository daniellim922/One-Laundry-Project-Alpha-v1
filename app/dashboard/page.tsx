import { Suspense } from "react";
import Link from "next/link";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardStatCardsSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

import { DashboardHomeStatsLoader } from "./dashboard-home-stats-loader";

export default function Page() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Dashboard Overview
                </h1>
                <p className="text-muted-foreground">
                    Key metrics and quick access to your workspace
                </p>
            </div>

            <Suspense
                fallback={
                    <DashboardStatCardsSkeleton columns={4} count={4} />
                }>
                <DashboardHomeStatsLoader />
            </Suspense>

            <Card>
                <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>
                        Common actions to manage your workspace
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href="/dashboard/worker/new">New worker</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/expenses/new">Add expense</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/timesheet/import">
                            Import timesheet
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/payroll/all">
                            View payrolls
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
