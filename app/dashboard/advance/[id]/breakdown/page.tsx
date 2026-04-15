import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { FormPageLayout } from "@/components/form-page-layout";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";
import { StepProgressPanel } from "@/components/ui/step-progress-panel";
import { Pencil } from "lucide-react";

import { AdvanceRequestForm } from "../../advance-request-form";
import { getAdvanceStepItems } from "../page";

export default async function AdvanceBreakdownPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const detail = await getAdvanceRequestByIdWithWorker(id);
    if (!detail) {
        notFound();
    }

    return (
        <FormPageLayout
            title="Advance request"
            subtitle={`Detail for worker ${detail.request.workerName}`}
            status={<EntityStatusBadge status={detail.request.status} />}
            maxWidthClassName="max-w-none"
            actions={
                detail.request.status === "Advance Paid" ? (
                    <Button variant="outline" disabled>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link
                            href={`/dashboard/advance/${id}/edit`}
                            className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                )
            }>
            <StepProgressPanel steps={getAdvanceStepItems(id)} activeStep={1} />
            <AdvanceRequestForm
                readOnly
                initialData={detail}
                advanceRequestId={id}
            />
        </FormPageLayout>
    );
}
