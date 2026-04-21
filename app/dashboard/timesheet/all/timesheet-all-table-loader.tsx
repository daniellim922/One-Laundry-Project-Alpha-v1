import Link from "next/link";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { columns, type TimesheetEntryWithWorker } from "../columns";

export async function TimesheetAllTableLoader() {
    const rows = await db
        .select({
            entry: timesheetTable,
            workerName: workerTable.name,
        })
        .from(timesheetTable)
        .innerJoin(workerTable, eq(timesheetTable.workerId, workerTable.id))
        .orderBy(
            asc(timesheetTable.status),
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
        <DataTable
            columns={columns}
            data={data}
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
    );
}
