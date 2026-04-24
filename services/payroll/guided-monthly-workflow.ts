export type GuidedMonthlyWorkflowStepStatus = "done" | "current" | "up_next";

export type GuidedMonthlyWorkflowStep = {
    id: "minimum_hours_bulk_update" | "timesheet_import" | "payroll_creation" | "payroll_download";
    label: string;
    href: string;
    status: GuidedMonthlyWorkflowStepStatus;
};

export type GuidedMonthlyWorkflowSnapshot = {
    monthKey: string;
    monthLabel: string;
    steps: GuidedMonthlyWorkflowStep[];
};

const BUSINESS_TIME_ZONE = "Asia/Singapore";

function formatBusinessMonthParts(now: Date): { year: string; month: string } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: BUSINESS_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
    }).formatToParts(now);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;

    if (!year || !month) {
        throw new Error("Unable to resolve business month parts");
    }

    return { year, month };
}

export function getGuidedMonthlyWorkflowSnapshot({
    now = new Date(),
}: {
    now?: Date;
} = {}): GuidedMonthlyWorkflowSnapshot {
    const { year, month } = formatBusinessMonthParts(now);

    return {
        monthKey: `${year}-${month}`,
        monthLabel: new Intl.DateTimeFormat("en-GB", {
            timeZone: BUSINESS_TIME_ZONE,
            month: "long",
            year: "numeric",
        }).format(now),
        steps: [
            {
                id: "minimum_hours_bulk_update",
                label: "Mass edit working hours",
                href: "/dashboard/worker/mass-edit",
                status: "current",
            },
            {
                id: "timesheet_import",
                label: "Import timesheets",
                href: "/dashboard/timesheet/import",
                status: "up_next",
            },
            {
                id: "payroll_creation",
                label: "Generate payroll",
                href: "/dashboard/payroll/new",
                status: "up_next",
            },
            {
                id: "payroll_download",
                label: "Download payrolls",
                href: "/dashboard/payroll/download-payrolls",
                status: "up_next",
            },
        ],
    };
}
