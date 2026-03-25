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

export default async function ViewTimesheetEntryPage({ params }: PageProps) {
    await requirePermission("Timesheet", "read");

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
                        View timesheet entry
                    </h1>
                    <p className="text-muted-foreground">
                        Clock in/out and worker for this entry (read-only)
                    </p>
                </div>
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
