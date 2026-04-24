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

import { getGuidedMonthlyWorkflowCompletedStepIds } from "@/services/payroll/guided-monthly-workflow-activity";

const BUSINESS_TIME_ZONE = "Asia/Singapore";
const ORDERED_STEPS = [
    {
        id: "minimum_hours_bulk_update" as const,
        label: "Mass edit working hours",
        href: "/dashboard/worker/mass-edit",
    },
    {
        id: "timesheet_import" as const,
        label: "Import timesheets",
        href: "/dashboard/timesheet/import",
    },
    {
        id: "payroll_creation" as const,
        label: "Generate payroll",
        href: "/dashboard/payroll/new",
    },
    {
        id: "payroll_download" as const,
        label: "Download payrolls",
        href: "/dashboard/payroll/download-payrolls",
    },
];

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

export async function getGuidedMonthlyWorkflowSnapshot({
    now = new Date(),
}: {
    now?: Date;
} = {}): Promise<GuidedMonthlyWorkflowSnapshot> {
    const { year, month } = formatBusinessMonthParts(now);
    const monthKey = `${year}-${month}`;
    const completedStepIds = new Set(
        await getGuidedMonthlyWorkflowCompletedStepIds({
            monthKey,
        }),
    );
    const firstIncompleteStepIndex = ORDERED_STEPS.findIndex(
        (step) => !completedStepIds.has(step.id),
    );

    return {
        monthKey,
        monthLabel: new Intl.DateTimeFormat("en-GB", {
            timeZone: BUSINESS_TIME_ZONE,
            month: "long",
            year: "numeric",
        }).format(now),
        steps: ORDERED_STEPS.map((step, index) => ({
            ...step,
            status: completedStepIds.has(step.id)
                ? "done"
                : index === firstIncompleteStepIndex ||
                    firstIncompleteStepIndex === -1
                  ? "current"
                  : "up_next",
        })),
    };
}
