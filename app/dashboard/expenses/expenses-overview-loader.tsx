import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { FolderTree, List, Plus } from "lucide-react";

import {
    ExpenseMonthlyOverviewChart,
    type ExpenseMonthlyOverviewCopy,
} from "./expense-monthly-overview-chart";
import { getExpenseMonthlyAggregates } from "./get-expense-monthly-aggregates";

const EXPENSE_MONTHLY_AMOUNTS_COPY = {
    title: "Monthly expense amounts",
    description:
        "Grand Total or Subtotal for all expenses, stacked by supplier by calendar month of invoice date. Use the amount control to choose Subtotal or Grand Total. Category and subcategory in the filter row bulk select or clear supplier rows in that group; individual suppliers can be toggled under each category heading. Suppliers are grouped under each category — subcategory. Only supplier lines with an expense in the selected year are listed.",
    emptyListYear: "No expense amounts for this year.",
    emptyListSearch: "No suppliers match this search.",
    emptyListCategory:
        "No suppliers match the current category or subcategory breakdown.",
    emptyChartYear: "No amount to chart for this year.",
    emptyChartAllDeselected:
        "No amount to chart — all suppliers are deselected.",
    emptyChartMonths: "Select at least one month to see the chart.",
    emptyChartSelection:
        "Select suppliers or adjust search to see the chart.",
    idPrefix: "expense-monthly-amounts",
} satisfies ExpenseMonthlyOverviewCopy;

export async function ExpensesOverviewLoader() {
    const expenseMonthlyRows = await getExpenseMonthlyAggregates();

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

            <ExpenseMonthlyOverviewChart
                rows={expenseMonthlyRows.rows}
                defaultYear={expenseMonthlyRows.defaultYear}
                yearOptions={expenseMonthlyRows.yearOptions}
                copy={EXPENSE_MONTHLY_AMOUNTS_COPY}
            />
        </div>
    );
}
