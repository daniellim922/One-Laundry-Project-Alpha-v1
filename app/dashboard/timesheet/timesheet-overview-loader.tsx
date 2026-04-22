import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { TimesheetMonthlyHoursOverviewCard } from "@/components/dashboard/timesheet-monthly-hours-overview-card";
import { List, Plus, Upload } from "lucide-react";

import { getTimesheetMonthlyHoursAggregates } from "./get-timesheet-monthly-hours-aggregates";

export async function TimesheetOverviewLoader() {
    const { rows, defaultYear, yearOptions } =
        await getTimesheetMonthlyHoursAggregates();

    return (
        <div className="space-y-6">
            <DashboardQuickActionsCard
                title="Quick actions"
                actions={[
                    {
                        href: "/dashboard/timesheet/all",
                        label: "All timesheets",
                        icon: List,
                    },
                    {
                        href: "/dashboard/timesheet/new",
                        label: "New timesheet",
                        icon: Plus,
                    },
                    {
                        href: "/dashboard/timesheet/import",
                        label: "Import timesheets",
                        icon: Upload,
                    },
                ]}
            />
            <TimesheetMonthlyHoursOverviewCard
                rows={rows}
                defaultYear={defaultYear}
                yearOptions={yearOptions}
            />
        </div>
    );
}
