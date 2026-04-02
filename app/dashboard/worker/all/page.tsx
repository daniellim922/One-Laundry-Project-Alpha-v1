import Link from "next/link";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    workerTable,
    type WorkerWithEmployment,
} from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { columns } from "../columns";
import { DataTable } from "@/components/data-table/DataTable";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function Page() {
    const workers = (await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            nric: workerTable.nric,
            email: workerTable.email,
            phone: workerTable.phone,
            status: workerTable.status,
            countryOfOrigin: workerTable.countryOfOrigin,
            race: workerTable.race,
            employmentId: workerTable.employmentId,
            createdAt: workerTable.createdAt,
            updatedAt: workerTable.updatedAt,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            monthlyPay: employmentTable.monthlyPay,
            minimumWorkingHours: employmentTable.minimumWorkingHours,
            hourlyRate: employmentTable.hourlyRate,
            restDayRate: employmentTable.restDayRate,
            paymentMethod: employmentTable.paymentMethod,
            payNowPhone: employmentTable.payNowPhone,
            bankAccountNumber: employmentTable.bankAccountNumber,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .orderBy(desc(workerTable.updatedAt))) as WorkerWithEmployment[];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    All workers
                </h1>
                <p className="text-muted-foreground">
                    Manage and view your workers here.
                </p>
            </div>

            <Suspense fallback={<DataTableSkeleton />}>
                <DataTable
                    columns={columns}
                    data={workers}
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/worker/new">
                                <Plus className="mr-2 h-4 w-4" />
                                New worker
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
