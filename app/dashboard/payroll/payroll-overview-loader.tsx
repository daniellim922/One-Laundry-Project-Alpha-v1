import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import {
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

import { getPayrollMonthlyNetPayAggregates } from "./get-payroll-monthly-net-pay-aggregates";

const PAYROLL_MONTHLY_NET_PAY_COPY = {
    title: "Monthly net pay",
    description:
        "Voucher net pay for Settled payrolls, stacked by worker by calendar month of payroll date. Filter by employment type and arrangement; only workers with a Settled payroll in the selected year are listed.",
    emptyListYear: "No Settled payroll net pay for this year.",
    emptyListEmployment:
        "No workers match the selected employment filters.",
    emptyListSearch: "No workers match this search.",
    emptyChartYear: "No net pay to chart for this year.",
    emptyChartEmployment:
        "No net pay to chart for the selected employment filters.",
    emptyChartMonths: "Select at least one month to see the chart.",
    emptyChartSelection:
        "Select workers or adjust search to see the chart.",
    idPrefix: "payroll-net",
    stackId: "netPay",
} satisfies MonthlyWorkerStackedAmountCopy;

export async function PayrollOverviewLoader() {
    const { rows, defaultYear, yearOptions } =
        await getPayrollMonthlyNetPayAggregates();

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
                defaultYear={defaultYear}
                yearOptions={yearOptions}
                copy={PAYROLL_MONTHLY_NET_PAY_COPY}
            />
        </div>
    );
}
