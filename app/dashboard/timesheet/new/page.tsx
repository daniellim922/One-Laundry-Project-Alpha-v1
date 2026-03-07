import Link from "next/link";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { workersTable } from "@/db/tables/workersTable";
import { Button } from "@/components/ui/button";
import { TimesheetEntryForm } from "../timesheet-entry-form";
import { ArrowLeft } from "lucide-react";

export default async function NewTimesheetEntryPage() {
    await requirePermission("Timesheet", "create");

    const workers = await db
        .select({ id: workersTable.id, name: workersTable.name })
        .from(workersTable)
        .orderBy(workersTable.name);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/timesheet">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Add timesheet entry
                    </h1>
                    <p className="text-muted-foreground">
                        Record clock in and clock out for a worker
                    </p>
                </div>
            </div>
            <TimesheetEntryForm workers={workers} />
        </div>
    );
}
