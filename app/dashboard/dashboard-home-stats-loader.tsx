import Link from "next/link";
import { count, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { expensesTable } from "@/db/tables/expensesTable";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    DollarSign,
    FileSpreadsheet,
    LayoutDashboard,
    Users,
} from "lucide-react";

export async function DashboardHomeStatsLoader() {
    const [[workersResult], [expensesResult]] = await Promise.all([
        db.select({ count: count() }).from(workerTable),
        db
            .select({
                count: count(),
                total: sum(expensesTable.amount),
            })
            .from(expensesTable),
    ]);

    const workersCount = workersResult?.count ?? 0;
    const expensesCount = expensesResult?.count ?? 0;
    const expensesTotal = Number(expensesResult?.total ?? 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Workers
                    </CardTitle>
                    <Users className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {workersCount.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Active workers in your workforce
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                        <Link href="/dashboard/worker/all">
                            View workers
                            <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Expenses
                    </CardTitle>
                    <DollarSign className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${(expensesTotal / 100).toLocaleString()}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {expensesCount} expense record
                        {expensesCount > 1 ? "s" : ""}
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                        <Link href="/dashboard/expenses/all">
                            View expenses
                            <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Timesheet
                    </CardTitle>
                    <FileSpreadsheet className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">—</div>
                    <p className="text-muted-foreground text-xs">
                        Import Excel or CSV timesheets
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                        <Link href="/dashboard/timesheet/import">
                            Go to timesheet
                            <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Quick Start
                    </CardTitle>
                    <LayoutDashboard className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-xs">
                        Explore all dashboard areas
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                        <Link href="/dashboard/worker/all">
                            View workers
                            <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
