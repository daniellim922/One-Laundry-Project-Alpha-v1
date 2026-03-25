import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { checkPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
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
        <div className="w-full mx-auto max-w-6xl space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <BackButton href="/dashboard/timesheet/all" />
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-wide uppercase">
                            Timesheet entry
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Clock in/out and worker for this entry (read-only)
                        </p>
                    </div>
                </div>
                {canEdit ? (
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
                )}
            </div>
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
        </div>
    );
}
