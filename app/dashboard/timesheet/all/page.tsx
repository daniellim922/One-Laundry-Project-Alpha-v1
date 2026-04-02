import Link from "next/link";
import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { columns } from "../columns";
import { DataTable } from "@/components/data-table";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TimesheetEntryWithWorker } from "../columns";

export default async function TimesheetAllPage() {
    const rows = await db
        .select({
            entry: timesheetTable,
            workerName: workerTable.name,
        })
        .from(timesheetTable)
        .innerJoin(workerTable, eq(timesheetTable.workerId, workerTable.id))
        .orderBy(
            desc(timesheetTable.status),
            asc(workerTable.name),
            asc(timesheetTable.dateIn),
        );

    const data: TimesheetEntryWithWorker[] = rows.map((r) => ({
        id: r.entry.id,
        workerId: r.entry.workerId,
        dateIn: String(r.entry.dateIn),
        dateOut: String(r.entry.dateOut),
        timeIn: String(r.entry.timeIn),
        timeOut: String(r.entry.timeOut),
        hours: Number(r.entry.hours),
        status: r.entry.status,
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
                    <DataTableSkeleton />
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
                                Add new timesheet
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
