import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import {
    WorkerForm,
    type WorkerWithEmployment,
} from "../../worker-form";
import { WorkerFormPageLayout } from "../../worker-form-page-layout";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditWorkerPage({ params }: PageProps) {
    await requirePermission("Workers", "update");

    const { id } = await params;

    const [worker] = (await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            email: workerTable.email,
            phone: workerTable.phone,
            status: workerTable.status,
            countryOfOrigin: workerTable.countryOfOrigin,
            race: workerTable.race,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
            monthlyPay: employmentTable.monthlyPay,
            workingHours: employmentTable.workingHours,
            hourlyPay: employmentTable.hourlyPay,
            restDayPay: employmentTable.restDayPay,
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
        .limit(1)) as WorkerWithEmployment[];

    if (!worker) {
        notFound();
    }

    return (
        <WorkerFormPageLayout
            title="Edit worker"
            description="Update this worker's details.">
            <WorkerForm worker={worker} />
        </WorkerFormPageLayout>
    );
}
