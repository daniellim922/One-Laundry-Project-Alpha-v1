import Link from "next/link";
import { Suspense } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { timesheetEntriesTable } from "@/db/tables/timesheetEntriesTable";
import { workersTable } from "@/db/tables/workersTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TimesheetEntryWithWorker } from "./columns";

export default async function TimesheetPage() {
    const rows = await db
        .select({
            entry: timesheetEntriesTable,
            workerName: workersTable.name,
        })
        .from(timesheetEntriesTable)
        .innerJoin(
            workersTable,
            eq(timesheetEntriesTable.workerId, workersTable.id),
        )
        .orderBy(timesheetEntriesTable.date);

    const data: TimesheetEntryWithWorker[] = rows.map((r) => ({
        id: r.entry.id,
        workerId: r.entry.workerId,
        date: String(r.entry.date),
        timeIn: String(r.entry.timeIn),
        timeOut: String(r.entry.timeOut),
        workerName: r.workerName,
    }));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All timesheets
                </h1>
                <p className="text-muted-foreground">
                    View all clock-in and clock-out records
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Loading...
                    </div>
                }>
                <DataTable
                    columns={columns}
                    data={data}
                    searchKey="workerName"
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/timesheet/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add entry
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
