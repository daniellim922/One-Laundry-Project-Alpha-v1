import { count, eq, sum } from "drizzle-orm";

import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { db } from "@/lib/db";
import { expenseCategoryTable } from "@/db/tables/expenseCategoryTable";
import { expensesTable } from "@/db/tables/expensesTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import type { ExpenseCategoryType } from "@/types/status";
import { DollarSign, List, Plus } from "lucide-react";

function slugCategoryType(cat: ExpenseCategoryType): string {
    return cat.toLowerCase();
}

export async function ExpensesOverviewLoader() {
    const [[statsRow], categoryRows] = await Promise.all([
        db
            .select({
                count: count(),
                total: sum(expensesTable.grandTotalCents),
            })
            .from(expensesTable),
        db
            .select({
                categoryType: expenseCategoryTable.type,
                cnt: count(),
            })
            .from(expensesTable)
            .innerJoin(
                expenseCategoryTable,
                eq(expensesTable.categoryId, expenseCategoryTable.id),
            )
            .groupBy(expenseCategoryTable.type),
    ]);
    const expensesCount = statsRow?.count ?? 0;
    const expensesTotal = Number(statsRow?.total ?? 0);

    const categorySegments = categoryRows
        .filter((r) => Number(r.cnt) > 0)
        .map((r, i) => ({
            key: `${slugCategoryType(r.categoryType)}_${i}`,
            label: r.categoryType,
            value: Number(r.cnt),
        }));

    return (
        <div className="space-y-6">
            <DashboardQuickActionsCard
                title="Quick actions"
                actions={[
                    {
                        href: "/dashboard/expenses/all",
                        label: "All expenses",
                        icon: List,
                    },
                    {
                        href: "/dashboard/expenses/new",
                        label: "Add expense",
                        icon: Plus,
                    },
                ]}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total amount
                        </CardTitle>
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${(expensesTotal / 100).toLocaleString()}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {expensesCount} expense record
                            {expensesCount !== 1 ? "s" : ""}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>By category type</CardTitle>
                    <CardDescription>
                        Expense count per category type (Fixed / Variable)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {categorySegments.length > 0 ? (
                        <SimpleDonutChart
                            centerLabel="records"
                            segments={categorySegments}
                        />
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            No expenses yet.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
