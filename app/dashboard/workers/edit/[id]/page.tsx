import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workersTable, type SelectWorker } from "@/db/tables/workersTable";
import { WorkerForm } from "../../worker-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditWorkerPage({ params }: PageProps) {
    const { id } = await params;

    const [worker]: SelectWorker[] = await db
        .select()
        .from(workersTable)
        .where(eq(workersTable.id, id))
        .limit(1);

    if (!worker) {
        notFound();
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-3xl space-y-6 py-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Edit worker
                    </h1>
                    <p className="text-muted-foreground">
                        Update this worker&apos;s details.
                    </p>
                </div>

                <WorkerForm worker={worker} />
            </div>
        </div>
    );
}
