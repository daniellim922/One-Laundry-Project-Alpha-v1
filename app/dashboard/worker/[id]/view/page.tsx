import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { checkPermission } from "@/lib/permissions";
import { FormPageLayout } from "@/components/form-page-layout";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { Pencil } from "lucide-react";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
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
    const { userId } = await requirePermission("Workers", "read");

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

    const canEdit = await checkPermission(userId, "Workers", "update");

    return (
        <FormPageLayout
            title="View worker"
            subtitle="Worker details (read-only)."
            actions={
                canEdit ? (
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={`/dashboard/worker/${id}/edit`}
                            className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                )
            }>
            <WorkerForm worker={worker} disabled />
        </FormPageLayout>
    );
}
