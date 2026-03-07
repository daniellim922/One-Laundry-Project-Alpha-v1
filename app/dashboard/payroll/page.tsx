import Link from "next/link";
import { Suspense } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    payrollsTable,
    type SelectPayroll,
} from "@/db/tables/payrollsTable";
import { workersTable } from "@/db/tables/workersTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type PayrollWithWorker = SelectPayroll & {
    workerName: string;
};

export default async function Page() {
    const rows = await db
        .select({
            payroll: payrollsTable,
            workerName: workersTable.name,
        })
        .from(payrollsTable)
        .innerJoin(workersTable, eq(payrollsTable.workerId, workersTable.id));

    const data: PayrollWithWorker[] = rows.map((r) => ({
        ...r.payroll,
        workerName: r.workerName,
    }));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Payroll
                </h1>
                <p className="text-muted-foreground">
                    View and manage your payroll records.
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
                            <Link href="/dashboard/payroll/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Generate payroll
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
