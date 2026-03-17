import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
        })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    if (!entry) notFound();

    const workers = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .orderBy(workerTable.name);

    return (
        <div className="mx-auto max-w-md space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/timesheet">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Edit timesheet entry
                    </h1>
                    <p className="text-muted-foreground">
                        Update clock in/out and worker for this entry
                    </p>
                </div>
            </div>
            <TimesheetEntryForm
                workers={workers}
                entry={{
                    id: entry.id,
                    workerId: entry.workerId,
                    dateIn: String(entry.dateIn),
                    dateOut: String(entry.dateOut),
                    timeIn: String(entry.timeIn),
                    timeOut: String(entry.timeOut),
                }}
            />
        </div>
    );
}

