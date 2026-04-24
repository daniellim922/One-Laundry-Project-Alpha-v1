import { eq } from "drizzle-orm";

import { guidedMonthlyWorkflowActivityTable } from "@/db/tables/guidedMonthlyWorkflowActivityTable";
import type { GuidedMonthlyWorkflowStepId } from "@/db/tables/guidedMonthlyWorkflowActivityTable";
import { db } from "@/lib/db";

const BUSINESS_TIME_ZONE = "Asia/Singapore";

function resolveBusinessMonthParts(now: Date): { year: string; month: string } {
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

export function resolveBusinessMonthKey(now: Date = new Date()): string {
    const { year, month } = resolveBusinessMonthParts(now);
    return `${year}-${month}`;
}

export async function getGuidedMonthlyWorkflowCompletedStepIds({
    monthKey,
}: {
    monthKey: string;
}): Promise<GuidedMonthlyWorkflowStepId[]> {
    const rows = await db
        .select({
            stepId: guidedMonthlyWorkflowActivityTable.stepId,
        })
        .from(guidedMonthlyWorkflowActivityTable)
        .where(eq(guidedMonthlyWorkflowActivityTable.monthKey, monthKey));

    return rows.map((row) => row.stepId);
}

export async function recordGuidedMonthlyWorkflowStepCompletion({
    stepId,
    now = new Date(),
}: {
    stepId: GuidedMonthlyWorkflowStepId;
    now?: Date;
}) {
    const monthKey = resolveBusinessMonthKey(now);

    await db
        .insert(guidedMonthlyWorkflowActivityTable)
        .values({
            monthKey,
            stepId,
            completedAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: [
                guidedMonthlyWorkflowActivityTable.monthKey,
                guidedMonthlyWorkflowActivityTable.stepId,
            ],
            set: {
                completedAt: now,
                updatedAt: now,
            },
        });
}
