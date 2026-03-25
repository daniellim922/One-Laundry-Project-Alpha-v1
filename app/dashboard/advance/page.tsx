import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/require-permission";
import { checkPermission } from "@/lib/permissions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { ArrowRight, Banknote, Plus } from "lucide-react";

export default async function AdvanceOverviewPage() {
    const { userId } = await requirePermission("Advance", "read");
    const canCreate = await checkPermission(userId, "Advance", "create");

    const [[{ total }], [{ loanCount }]] = await Promise.all([
        db.select({ total: count() }).from(advanceRequestTable),
        db
            .select({ loanCount: count() })
            .from(advanceRequestTable)
            .where(eq(advanceRequestTable.status, "loan")),
    ]);
    const paidCount = Number(total) - Number(loanCount);

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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Advance requests
                        </CardTitle>
                        <Banknote className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-muted-foreground text-xs">
                            {loanCount} active loans
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/dashboard/advance/all">
                        All advances
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                {canCreate ? (
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/advance/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New advance
                        </Link>
                    </Button>
                ) : null}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Advances</CardTitle>
                    <CardDescription>Loan vs paid</CardDescription>
                </CardHeader>
                <CardContent>
                    <SimpleDonutChart
                        centerLabel="requests"
                        segments={[
                            {
                                key: "loan",
                                label: "Active loan",
                                value: Number(loanCount),
                            },
                            {
                                key: "paid",
                                label: "Paid",
                                value: paidCount,
                            },
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
