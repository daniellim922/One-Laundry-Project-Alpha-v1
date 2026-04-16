import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    workerTable,
    type WorkerWithEmployment,
} from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { WorkerAllTableSection } from "./worker-all-table-section";

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

    const workersForMassEdit = workers
        .filter(
            (worker) =>
                worker.status === "Active" &&
                worker.employmentType === "Full Time" &&
                worker.employmentArrangement === "Foreign Worker",
        )
        .map((worker) => ({
            id: worker.id,
            name: worker.name,
            employmentArrangement: worker.employmentArrangement,
            minimumWorkingHours: worker.minimumWorkingHours,
        }));

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

            <WorkerAllTableSection
                workers={workers}
                workersForMassEdit={workersForMassEdit}
            />
        </div>
    );
}
