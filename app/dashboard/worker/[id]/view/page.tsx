import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { FormPageLayout } from "@/components/form-page-layout";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { db } from "@/lib/db";
import { Pencil } from "lucide-react";
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

export default async function ViewWorkerPage({ params }: PageProps) {
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
            title="View worker"
            subtitle="Worker details (read-only)."
            status={<EntityStatusBadge status={worker.status} />}
            actions={
                <Button asChild variant="outline">
                    <Link
                        href={`/dashboard/worker/${id}/edit`}
                        className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Link>
                </Button>
            }>
            <WorkerForm worker={worker} disabled />
        </FormPageLayout>
    );
}
