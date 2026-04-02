import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/utils/require-permission";
import { checkPermission } from "@/utils/permissions";
import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { Button } from "@/components/ui/button";
import { FormPageLayout } from "@/components/form-page-layout";
import { Pencil } from "lucide-react";
import { TimesheetEntryForm } from "../../timesheet-entry-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ViewTimesheetEntryPage({ params }: PageProps) {
    const { userId } = await requirePermission("Timesheet", "read");

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

    const canEdit =
        entry.status !== "paid" &&
        (await checkPermission(userId, "Timesheet", "update"));

    const workers = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .orderBy(workerTable.name);

    return (
        <FormPageLayout
            title="Timesheet entry"
            subtitle="Clock in/out and worker for this entry (read-only)"
            actions={
                canEdit ? (
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={`/dashboard/timesheet/${id}/edit`}
                            className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                )
            }>
            <TimesheetEntryForm
                workers={workers}
                disabled
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
