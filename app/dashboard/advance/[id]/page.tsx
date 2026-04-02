import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormPageLayout } from "@/components/form-page-layout";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advances-queries";
import { requirePermission } from "@/utils/require-permission";
import { checkPermission } from "@/utils/permissions";
import { Pencil } from "lucide-react";

import { AdvanceRequestForm } from "../advance-request-form";

export default async function AdvanceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { userId } = await requirePermission("Advance", "read");
    const canUpdate = await checkPermission(userId, "Advance", "update");

    const { id } = await params;
    const detail = await getAdvanceRequestByIdWithWorker(id);
    if (!detail) {
        notFound();
    }

    return (
        <FormPageLayout
            title="Advance request"
            subtitle={`Detail for worker ${detail.request.workerName}`}
            actions={
                !canUpdate || detail.request.status === "paid" ? (
                    <Button variant="outline" size="sm" disabled>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                ) : (
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={`/dashboard/advance/${id}/edit`}
                            className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                )
            }>
            <AdvanceRequestForm
                readOnly
                initialData={detail}
                advanceRequestId={id}
            />
        </FormPageLayout>
    );
}
