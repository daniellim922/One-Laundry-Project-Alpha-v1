import { AdvanceMonthlyRepaymentOverviewCard } from "@/components/dashboard/advance-monthly-repayment-overview-card";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { List, Plus } from "lucide-react";

import { getAdvanceMonthlyRepaymentAggregates } from "./get-advance-monthly-repayment-aggregates";

export async function AdvanceOverviewLoader() {
    const { rows, defaultYear, yearOptions } =
        await getAdvanceMonthlyRepaymentAggregates();

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
            <AdvanceMonthlyRepaymentOverviewCard
                rows={rows}
                defaultYear={defaultYear}
                yearOptions={yearOptions}
            />
        </div>
    );
}
