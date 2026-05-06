import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import type { WorkerWithEmployment } from "@/db/tables/workerTable";

export async function loadWorkerById(
    id: string,
): Promise<WorkerWithEmployment | null> {
    const [worker] = await db
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
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            shiftPattern: employmentTable.shiftPattern,
            cpf: employmentTable.cpf,
            monthlyPay: employmentTable.monthlyPay,
            minimumWorkingHours: employmentTable.minimumWorkingHours,
            hourlyRate: employmentTable.hourlyRate,
            restDayRate: employmentTable.restDayRate,
            paymentMethod: employmentTable.paymentMethod,
            payNowPhone: employmentTable.payNowPhone,
            bankAccountNumber: employmentTable.bankAccountNumber,
            createdAt: workerTable.createdAt,
            updatedAt: workerTable.updatedAt,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(eq(workerTable.id, id))
        .limit(1);

    return worker ?? null;
}
