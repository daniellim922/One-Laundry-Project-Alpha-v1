import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import {
    formatStackedChartCurrency,
    getStackedRowTotalAmount,
    MonthlyWorkerStackedAmountOverviewCard,
    type MonthlyWorkerStackedAmountCopy,
} from "@/components/dashboard/monthly-worker-stacked-amount-overview-card";
import {
    CalendarDays,
    ClipboardCheck,
    Download,
    List,
    Plus,
} from "lucide-react";

import { getPayrollMonthlyGrandTotalAggregates } from "./get-payroll-monthly-grand-total-aggregates";

const PAYROLL_MONTHLY_GRAND_TOTAL_COPY = {
    title: "Monthly Grand Total",
    description:
        "Voucher Grand Total for Settled payrolls, stacked by worker by calendar month of payroll date. Employment type and arrangement checkboxes select or clear all workers in that group; individual workers can be toggled separately. Only workers with a Settled payroll in the selected year are listed.",
    emptyListYear: "No Settled payroll Grand Total for this year.",
    emptyListEmployment:
        "No workers match the selected employment filters.",
    emptyListSearch: "No workers match this search.",
    emptyChartYear: "No Grand Total to chart for this year.",
    emptyChartEmployment:
        "No Grand Total to chart — all workers are deselected.",
    emptyChartMonths: "Select at least one month to see the chart.",
    emptyChartSelection:
        "Select workers or adjust search to see the chart.",
    idPrefix: "payroll-grand-total",
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
            <MonthlyWorkerStackedAmountOverviewCard
                rows={rows}
                getValue={getStackedRowTotalAmount}
                defaultYear={defaultYear}
                yearOptions={yearOptions}
                copy={PAYROLL_MONTHLY_GRAND_TOTAL_COPY}
            />
        </div>
    );
}
