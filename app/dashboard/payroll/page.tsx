import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import { SettleAllDraftPayrollsButton } from "./settle-all-drafts-button";
import { DownloadPayrollsButton } from "./download-payrolls-button";

export default async function PayrollOverviewPage() {
    const [[{ total }], [{ draftCount }]] = await Promise.all([
        db.select({ total: count() }).from(payrollTable),
        db
            .select({ draftCount: count() })
            .from(payrollTable)
            .where(eq(payrollTable.status, "Draft")),
    ]);

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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Payroll records
                        </CardTitle>
                        <Wallet className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-muted-foreground text-xs">
                            {draftCount} draft ·{" "}
                            {Number(total) - Number(draftCount)} settled
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/dashboard/payroll/all">
                        All payrolls
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <SettleAllDraftPayrollsButton />
                <DownloadPayrollsButton />
                <Button variant="outline" asChild>
                    <Link href="/dashboard/payroll/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New payroll
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payroll by status</CardTitle>
                    <CardDescription>Draft vs settled</CardDescription>
                </CardHeader>
                <CardContent>
                    <SimpleDonutChart
                        centerLabel="runs"
                        segments={[
                            {
                                key: "Draft",
                                label: "Draft",
                                value: Number(draftCount),
                            },
                            {
                                key: "Settled",
                                label: "Settled",
                                value: Number(total) - Number(draftCount),
                            },
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
