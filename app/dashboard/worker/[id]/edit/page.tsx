import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { FormPageLayout } from "@/components/form-page-layout";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import {
    WorkerForm,
    type WorkerWithEmployment,
} from "../../worker-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditWorkerPage({ params }: PageProps) {
    const { id } = await params;

    const [worker] = (await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            nric: workerTable.nric,
            email: workerTable.email,
            phone: workerTable.phone,
            status: workerTable.status,
            countryOfOrigin: workerTable.countryOfOrigin,
            race: workerTable.race,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
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
        .limit(1)) as WorkerWithEmployment[];

    if (!worker) {
        notFound();
    }

    return (
        <FormPageLayout
            title="Edit worker"
            subtitle="Update this worker's details."
            status={<EntityStatusBadge status={worker.status} />}>
            <WorkerForm worker={worker} />
        </FormPageLayout>
    );
}
