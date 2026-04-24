import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const guidedMonthlyWorkflowStepIds = [
    "minimum_hours_bulk_update",
    "timesheet_import",
    "payroll_creation",
    "payroll_download",
] as const;

export type GuidedMonthlyWorkflowStepId =
    (typeof guidedMonthlyWorkflowStepIds)[number];

export const guidedMonthlyWorkflowActivityTable = pgTable(
    "guided_monthly_workflow_activity",
    {
        id: uuid().primaryKey().defaultRandom(),
        monthKey: text("month_key").notNull(),
        stepId: text("step_id", {
            enum: guidedMonthlyWorkflowStepIds,
        }).notNull(),
        completedAt: timestamp("completed_at", { withTimezone: false })
            .notNull()
            .defaultNow(),
        createdAt: timestamp("created_at", { withTimezone: false })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: false })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        uniqueIndex("guided_monthly_workflow_activity_month_step_unique").on(
            table.monthKey,
            table.stepId,
        ),
    ],
);

export type SelectGuidedMonthlyWorkflowActivity =
    typeof guidedMonthlyWorkflowActivityTable.$inferSelect;
export type InsertGuidedMonthlyWorkflowActivity =
    typeof guidedMonthlyWorkflowActivityTable.$inferInsert;
