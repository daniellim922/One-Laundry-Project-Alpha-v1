import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { DollarSign, FolderTree, List, Plus, TrendingUp } from "lucide-react";
import { listExpensesWithCategories } from "@/services/expense/list-expenses";

function singaporeYearMonth(d: Date) {
    const y = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore",
        year: "numeric",
    }).format(d);
    const m = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore",
        month: "2-digit",
    }).format(d);
    return `${y}-${m}`;
}

function previousYearMonth(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    const month = m - 1;
    if (month < 1) return `${y - 1}-12`;
    return `${y}-${String(month).padStart(2, "0")}`;
}

export async function ExpensesOverviewLoader() {
    const rows = await listExpensesWithCategories();

    const totalSpendCents = rows.reduce((s, r) => s + r.grandTotalCents, 0);
    const expensesCount = rows.length;

    const statusCount = new Map<string, number>();
    const categorySpend = new Map<string, number>();
    const subSpend = new Map<
        string,
        { label: string; cents: number }
    >();

    for (const r of rows) {
        statusCount.set(r.status, (statusCount.get(r.status) ?? 0) + 1);
        categorySpend.set(
            r.categoryName,
            (categorySpend.get(r.categoryName) ?? 0) +
                r.grandTotalCents,
        );
        const key = `${r.categoryName}::${r.subcategoryName}`;
        const label = `${r.categoryName} — ${r.subcategoryName}`;
        const prev = subSpend.get(key);
        if (prev) {
            prev.cents += r.grandTotalCents;
        } else {
            subSpend.set(key, {
                label,
                cents: r.grandTotalCents,
            });
        }
    }

    const now = new Date();
    const currentYm = singaporeYearMonth(now);
    const prevYm = previousYearMonth(currentYm);

    let monthSpend = 0;
    let prevMonthSpend = 0;
    for (const r of rows) {
        const subYm =
            typeof r.submissionDate === "string"
                ? r.submissionDate.slice(0, 7)
                : String(r.submissionDate).slice(0, 7);
        if (subYm === currentYm) monthSpend += r.grandTotalCents;
        if (subYm === prevYm) prevMonthSpend += r.grandTotalCents;
    }

    const momDelta =
        prevMonthSpend === 0
            ? null
            : ((monthSpend - prevMonthSpend) / prevMonthSpend) * 100;

    const statusSegments = [...statusCount.entries()]
        .filter(([, cnt]) => cnt > 0)
        .map(([label, value], i) => ({
            key: `st_${i}`,
            label,
            value,
        }));

    const categorySpendSegments = [...categorySpend.entries()]
        .filter(([, cents]) => cents > 0)
        .map(([category, cents], i) => ({
            key: `ty_${i}`,
            label: category,
            value: cents,
        }));

    const subSpendSorted = [...subSpend.values()].sort(
        (a, b) => b.cents - a.cents,
    );

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
                    {
                        href: "/dashboard/expenses/categories",
                        label: "Manage categories",
                        icon: FolderTree,
                    },
                ]}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total spend
                        </CardTitle>
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            $
                            {(totalSpendCents / 100).toLocaleString("en-SG", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {expensesCount} expense record
                            {expensesCount !== 1 ? "s" : ""}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            This month (SG)
                        </CardTitle>
                        <TrendingUp className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            $
                            {(monthSpend / 100).toLocaleString("en-SG", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {currentYm} submission date · prev{" "}
                            $
                            {(prevMonthSpend / 100).toLocaleString("en-SG", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            {momDelta !== null ? (
                                <>
                                    {" "}
                                    ({momDelta >= 0 ? "+" : ""}
                                    {momDelta.toFixed(0)}%)
                                </>
                            ) : null}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>By status</CardTitle>
                        <CardDescription>Record count per status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statusSegments.length > 0 ? (
                            <SimpleDonutChart
                                centerLabel="records"
                                segments={statusSegments}
                            />
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No expenses yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Spend by category</CardTitle>
                        <CardDescription>
                            Grand total (SGD) per category name
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {categorySpendSegments.length > 0 ? (
                            <SimpleDonutChart
                                centerLabel="SGD (¢)"
                                formatCenterValue={(total) =>
                                    `$${(total / 100).toLocaleString("en-SG", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    })}`
                                }
                                segments={categorySpendSegments}
                            />
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No expenses yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>By subcategory</CardTitle>
                    <CardDescription>
                        Grand total (SGD) per subcategory
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {subSpendSorted.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category / Subcategory</TableHead>
                                    <TableHead className="text-right">
                                        Total
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subSpendSorted.map((r) => (
                                    <TableRow key={r.label}>
                                        <TableCell>{r.label}</TableCell>
                                        <TableCell className="text-right">
                                            $
                                            {(r.cents / 100).toLocaleString(
                                                "en-SG",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
