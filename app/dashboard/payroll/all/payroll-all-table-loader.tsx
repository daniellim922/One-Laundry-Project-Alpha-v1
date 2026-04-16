import Link from "next/link";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { columns, type PayrollWithWorker } from "./columns";

export async function PayrollAllTableLoader() {
    const rows = await db
        .select({
            payroll: payrollTable,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .orderBy(asc(payrollTable.status), asc(workerTable.name));

    const data: PayrollWithWorker[] = rows.map((r) => ({
        ...r.payroll,
        workerName: r.workerName,
        employmentType: r.employmentType,
        employmentArrangement: r.employmentArrangement,
    }));

    return (
        <DataTable
            columns={columns}
            data={data}
            searchParamKey="search"
            actions={
                <Button asChild>
                    <Link href="/dashboard/payroll/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New payroll
                    </Link>
                </Button>
            }
        />
    );
}
