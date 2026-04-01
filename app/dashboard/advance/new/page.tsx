import { asc } from "drizzle-orm";

import { FormPageLayout } from "@/components/form-page-layout";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { requirePermission } from "@/lib/require-permission";

import { AdvanceRequestForm } from "./advance-request-form";

export default async function AdvanceRequestPage({
    searchParams,
}: {
    searchParams: Promise<{ workerId?: string }>;
}) {
    await requirePermission("Advance", "create");

    const { workerId: initialWorkerId } = await searchParams;

    const workers = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
        })
        .from(workerTable)
        .orderBy(asc(workerTable.name));

    return (
        <FormPageLayout
            title="Employee advance request form"
            subtitle="Complete all sections. Advance details (amount and dates) are stored; other fields match the paper form for your records."
            maxWidthClassName="max-w-4xl">
            {workers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    No workers yet. Add a worker first.
                </p>
            ) : (
                <AdvanceRequestForm
                    key={initialWorkerId ?? "new"}
                    workers={workers}
                    initialWorkerId={initialWorkerId ?? undefined}
                />
            )}
        </FormPageLayout>
    );
}
