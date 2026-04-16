import Link from "next/link";
import { count, sum } from "drizzle-orm";

import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { db } from "@/lib/db";
import { expensesTable } from "@/db/tables/expensesTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowRight, DollarSign, Plus } from "lucide-react";

function slugCategory(cat: string | null): string {
    const base = (cat ?? "uncategorized").toLowerCase().replace(/\s+/g, "_");
    return base.replace(/[^a-z0-9_]/g, "") || "uncategorized";
}

export async function ExpensesOverviewLoader() {
    const [[statsRow], categoryRows] = await Promise.all([
        db
            .select({
                count: count(),
                total: sum(expensesTable.amount),
            })
            .from(expensesTable),
        db
            .select({
                category: expensesTable.category,
                cnt: count(),
            })
            .from(expensesTable)
            .groupBy(expensesTable.category),
    ]);
    const expensesCount = statsRow?.count ?? 0;
    const expensesTotal = Number(statsRow?.total ?? 0);

    const categorySegments = categoryRows
        .filter((r) => Number(r.cnt) > 0)
        .map((r, i) => ({
            key: `${slugCategory(r.category)}_${i}`,
            label: r.category?.trim() || "Uncategorized",
            value: Number(r.cnt),
        }));

    return (
        <>
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

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/dashboard/expenses/all">
                        All expenses
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/expenses/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add expense
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>By category</CardTitle>
                    <CardDescription>Expense count per category</CardDescription>
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
        </>
    );
}
