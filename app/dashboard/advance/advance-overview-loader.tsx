import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { Banknote, List, Plus } from "lucide-react";

export async function AdvanceOverviewLoader() {
    const [[{ total }], [{ advanceLoanCount }]] = await Promise.all([
        db.select({ total: count() }).from(advanceRequestTable),
        db
            .select({ advanceLoanCount: count() })
            .from(advanceRequestTable)
            .where(eq(advanceRequestTable.status, "Advance Loan")),
    ]);
    const paidCount = Number(total) - Number(advanceLoanCount);

    return (
        <div className="space-y-6">
            <DashboardQuickActionsCard
                title="Quick actions"
                actions={[
                    {
                        href: "/dashboard/advance/all",
                        label: "All advances",
                        icon: List,
                    },
                    {
                        href: "/dashboard/advance/new",
                        label: "New advance",
                        icon: Plus,
                    },
                ]}
            />

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
                            {advanceLoanCount} Advance Loan requests
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Advances</CardTitle>
                    <CardDescription>
                        Advance Loan vs Advance Paid
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SimpleDonutChart
                        centerLabel="requests"
                        segments={[
                            {
                                key: "Advance Loan",
                                label: "Active loan",
                                value: Number(advanceLoanCount),
                            },
                            {
                                key: "Advance Paid",
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
