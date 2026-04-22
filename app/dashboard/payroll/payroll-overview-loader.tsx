import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import {
    CalendarDays,
    ClipboardCheck,
    Download,
    List,
    Plus,
    Wallet,
} from "lucide-react";

export async function PayrollOverviewLoader() {
    const [[{ total }], [{ draftCount }]] = await Promise.all([
        db.select({ total: count() }).from(payrollTable),
        db
            .select({ draftCount: count() })
            .from(payrollTable)
            .where(eq(payrollTable.status, "Draft")),
    ]);

    return (
        <div className="space-y-6">
            <DashboardQuickActionsCard
                title="Quick actions"
                actions={[
                    {
                        href: "/dashboard/payroll/all",
                        label: "All payrolls",
                        icon: List,
                    },
                    {
                        href: "/dashboard/payroll/settle-drafts",
                        label: "Settle drafts",
                        icon: ClipboardCheck,
                    },
                    {
                        href: "/dashboard/payroll/download-payrolls",
                        label: "Download payrolls",
                        icon: Download,
                    },
                    {
                        href: "/dashboard/payroll/new",
                        label: "New payroll",
                        icon: Plus,
                    },
                    {
                        href: "/dashboard/payroll/public-holidays",
                        label: "Public holidays",
                        icon: CalendarDays,
                    },
                ]}
            />

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
                            {draftCount} Draft ·{" "}
                            {Number(total) - Number(draftCount)} Settled
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payroll by status</CardTitle>
                    <CardDescription>Draft vs Settled</CardDescription>
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
