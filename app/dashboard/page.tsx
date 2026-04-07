import Link from "next/link";

import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { expensesTable } from "@/db/expensesTable";
import { count, sum } from "drizzle-orm";
import {
    Card,
    CardContent,
    CardDescription,
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

export default async function Page() {
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Dashboard Overview
                </h1>
                <p className="text-muted-foreground">
                    Key metrics and quick access to your workspace
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Workers
                        </CardTitle>
                        <Users className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workersCount}</div>
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
                        <Link href="/dashboard/iam/roles">Manage IAM</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
