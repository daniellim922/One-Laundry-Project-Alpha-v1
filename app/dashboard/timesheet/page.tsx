import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { ArrowRight, FileSpreadsheet, Plus, Upload } from "lucide-react";

export default async function TimesheetOverviewPage() {
    const [[{ total }], [{ unpaid }]] = await Promise.all([
        db.select({ total: count() }).from(timesheetTable),
        db
            .select({ unpaid: count() })
            .from(timesheetTable)
            .where(eq(timesheetTable.status, "Timesheet Unpaid")),
    ]);

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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total entries
                        </CardTitle>
                        <FileSpreadsheet className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-muted-foreground text-xs">
                            {unpaid} Timesheet Unpaid ·{" "}
                            {Number(total) - Number(unpaid)} Timesheet Paid
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/dashboard/timesheet/all">
                        All timesheets
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/timesheet/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New timesheet
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/timesheet/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import timesheets
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment status</CardTitle>
                    <CardDescription>Timesheet Unpaid vs Timesheet Paid entries</CardDescription>
                </CardHeader>
                <CardContent>
                    <SimpleDonutChart
                        centerLabel="entries"
                        segments={[
                            {
                                key: "Timesheet Unpaid",
                                label: "Timesheet Unpaid",
                                value: Number(unpaid),
                            },
                            {
                                key: "Timesheet Paid",
                                label: "Timesheet Paid",
                                value: Number(total) - Number(unpaid),
                            },
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
