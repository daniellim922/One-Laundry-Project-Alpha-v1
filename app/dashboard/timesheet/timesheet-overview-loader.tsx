import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { List, Plus, Upload } from "lucide-react";

export function TimesheetOverviewLoader() {
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
        </div>
    );
}
