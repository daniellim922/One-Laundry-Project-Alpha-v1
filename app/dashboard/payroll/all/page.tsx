import Link from "next/link";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    payrollTable,
    type SelectPayroll,
} from "@/db/tables/payroll/payrollTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { columns, type PayrollWithWorker } from "../columns";
import { DataTable } from "@/components/data-table";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PayrollAllPage() {
    const rows = await db
        .select({
            payroll: payrollTable,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
        .orderBy(asc(payrollTable.status), asc(workerTable.name));

    const data: PayrollWithWorker[] = rows.map((r) => ({
        ...r.payroll,
        workerName: r.workerName,
        employmentType: r.employmentType,
        employmentArrangement: r.employmentArrangement,
    }));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All payrolls
                </h1>
                <p className="text-muted-foreground">
                    View and manage your payroll records.
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
                            <Link href="/dashboard/payroll/new">
                                <Plus className="mr-2 h-4 w-4" />
                                New payroll
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
