import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import {
    CalendarDays,
    ClipboardCheck,
    Download,
    List,
    Plus,
} from "lucide-react";

export function PayrollOverviewLoader() {
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
        </div>
    );
}
