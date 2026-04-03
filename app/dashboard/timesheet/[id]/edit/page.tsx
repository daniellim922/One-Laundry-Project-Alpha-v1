import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/utils/permissions/require-permission";
import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { FormPageLayout } from "@/components/form-page-layout";
import { TimesheetEntryForm } from "../../timesheet-entry-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditTimesheetEntryPage({ params }: PageProps) {
    await requirePermission("Timesheet", "update");

    const { id } = await params;

    const [entry] = await db
        .select({
            id: timesheetTable.id,
            workerId: timesheetTable.workerId,
            dateIn: timesheetTable.dateIn,
            dateOut: timesheetTable.dateOut,
            timeIn: timesheetTable.timeIn,
            timeOut: timesheetTable.timeOut,
            status: timesheetTable.status,
        })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    if (!entry) notFound();

    if (entry.status === "paid") {
        redirect(`/dashboard/timesheet/${id}/view`);
    }

    const workers = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .orderBy(workerTable.name);

    return (
        <FormPageLayout
            title="Edit timesheet entry"
            subtitle="Update clock in/out and worker for this entry"
            status={<EntityStatusBadge status={entry.status} />}>
            <TimesheetEntryForm
                workers={workers}
                entry={{
                    id: entry.id,
                    workerId: entry.workerId,
                    dateIn: String(entry.dateIn),
                    dateOut: String(entry.dateOut),
                    timeIn: String(entry.timeIn),
                    timeOut: String(entry.timeOut),
                    status: entry.status,
                }}
            />
        </FormPageLayout>
    );
}
