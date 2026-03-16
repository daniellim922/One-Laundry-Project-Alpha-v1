import Link from "next/link";
import { Suspense } from "react";
import { count, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { expensesTable, type SelectExpense } from "@/db/expensesTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Plus } from "lucide-react";

export default async function Page() {
    const [expenses, statsResult] = await Promise.all([
        db.select().from(expensesTable),
        db
            .select({
                count: count(),
                total: sum(expensesTable.amount),
            })
            .from(expensesTable),
    ]);
    const expensesCount = statsResult[0]?.count ?? 0;
    const expensesTotal = Number(statsResult[0]?.total ?? 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Expenses
                </h1>
                <p className="text-muted-foreground">
                    View and manage your expenses here.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Amount
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
                        <Button variant="link" className="h-auto p-0" asChild>
                            <Link href="/dashboard/expenses">
                                View all expenses
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button asChild size="sm">
                            <Link href="/dashboard/expenses/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add expense
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/expenses">
                                Browse expenses
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Suspense
                fallback={
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Loading...
                    </div>
                }>
                <DataTable
                    columns={columns}
                    data={expenses}
                    searchKey="description"
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/expenses/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add expense
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
