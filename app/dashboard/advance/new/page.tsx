import { asc } from "drizzle-orm";

import { BackButton } from "@/components/back-button";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { requirePermission } from "@/lib/require-permission";

import { AdvanceRequestForm } from "./advance-request-form";

export default async function AdvanceRequestPage({
    searchParams,
}: {
    searchParams: Promise<{ workerId?: string }>;
}) {
    await requirePermission("Payroll", "create");

    const { workerId: initialWorkerId } = await searchParams;

    const workers = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
        })
        .from(workerTable)
        .orderBy(asc(workerTable.name));

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div className="flex items-center gap-3">
                <BackButton href="/dashboard/advance" />
                <div>
                    <h1 className="text-xl font-semibold tracking-wide uppercase">
                        Employee advance request form
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Complete all sections. Advance details (amount and dates)
                        are stored; other fields match the paper form for your
                        records.
                    </p>
                </div>
            </div>

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
        </div>
    );
}
