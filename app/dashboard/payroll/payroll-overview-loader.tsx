import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import {
    formatStackedChartCurrency,
    type MonthlyWorkerStackedAmountCopy,
} from "@/components/dashboard/monthly-worker-stacked-amount-overview-card";
import { PayrollMonthlyOverviewChart } from "@/app/dashboard/payroll/payroll-monthly-overview-chart";
import {
    CalendarDays,
    ClipboardCheck,
    Download,
    List,
    Plus,
} from "lucide-react";

import { getPayrollMonthlyGrandTotalAggregates } from "./get-payroll-monthly-grand-total-aggregates";

const PAYROLL_MONTHLY_AMOUNTS_COPY = {
    title: "Monthly payroll amounts",
    description:
        "Voucher Subtotal or Grand Total for Settled payrolls, stacked by worker by calendar month of payroll date. Use the amount control to choose Subtotal or Grand Total. Employment type and arrangement in the top row bulk select or clear all workers in that group; individual workers can be toggled in the list. Only workers with a Settled payroll in the selected year are listed.",
    emptyListYear: "No Settled payroll amounts for this year.",
    emptyListEmployment:
        "No workers match the selected employment filters.",
    emptyListSearch: "No workers match this search.",
    emptyChartYear: "No amount to chart for this year.",
    emptyChartEmployment:
        "No amount to chart — all workers are deselected.",
    emptyChartMonths: "Select at least one month to see the chart.",
    emptyChartSelection:
        "Select workers or adjust search to see the chart.",
    idPrefix: "payroll-monthly-amounts",
    stackId: "grandTotal",
    formatValue: formatStackedChartCurrency,
} satisfies MonthlyWorkerStackedAmountCopy;

export async function PayrollOverviewLoader() {
    const { rows, defaultYear, yearOptions } =
        await getPayrollMonthlyGrandTotalAggregates();

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
                        href: "/dashboard/payroll/new",
                        label: "New payroll",
                        icon: Plus,
                    },
                    {
                        href: "/dashboard/payroll/public-holidays",
                        label: "Public holidays",
                        icon: CalendarDays,
                    },
                    {
                        href: "/dashboard/payroll/download-payrolls",
                        label: "Download payrolls",
                        icon: Download,
                    },
                    {
                        href: "/dashboard/payroll/settle-drafts",
                        label: "Settle drafts",
                        icon: ClipboardCheck,
                    },
                ]}
            />
            <PayrollMonthlyOverviewChart
                rows={rows}
                defaultYear={defaultYear}
                yearOptions={yearOptions}
                copy={PAYROLL_MONTHLY_AMOUNTS_COPY}
            />
        </div>
    );
}
