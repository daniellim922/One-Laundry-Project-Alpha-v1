import Link from "next/link";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    workerTable,
    type WorkerWithEmployment,
} from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function Page() {
    const workers = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
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
            workingHours: employmentTable.workingHours,
            hourlyPay: employmentTable.hourlyPay,
            restDayPay: employmentTable.restDayPay,
            paymentMethod: employmentTable.paymentMethod,
            payNowPhone: employmentTable.payNowPhone,
            bankAccountNumber: employmentTable.bankAccountNumber,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .orderBy(desc(workerTable.updatedAt)) as WorkerWithEmployment[];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Workers
                </h1>
                <p className="text-muted-foreground">
                    Manage and view your workers here.
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
                    data={workers}
                    searchKey="name"
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/workers/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add worker
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
