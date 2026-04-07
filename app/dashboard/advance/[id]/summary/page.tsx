import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { FormPageLayout } from "@/components/form-page-layout";
import { StepProgressPanel } from "@/components/ui/step-progress-panel";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";
import { requirePermission } from "@/utils/permissions/require-permission";
import { checkPermission } from "@/utils/permissions/permissions";
import { Pencil } from "lucide-react";

import { getAdvanceStepItems } from "../page";
import { AdvanceSummaryCapture } from "../advance-summary-capture";
import { AdvanceDownloadVoucher } from "../advance-downloadable";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdvanceSummaryPage({ params }: PageProps) {
    const { userId } = await requirePermission("Advance", "read");

    const { id } = await params;
    const detail = await getAdvanceRequestByIdWithWorker(id);
    if (!detail) {
        notFound();
    }
    const canUpdate = await checkPermission(userId, "Advance", "update");

    return (
        <FormPageLayout
            title="Advance request"
            subtitle={`Summary for worker ${detail.request.workerName}`}
            status={<EntityStatusBadge status={detail.request.status} />}
            maxWidthClassName="max-w-none"
            actions={
                !canUpdate || detail.request.status === "Paid" ? (
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
            <StepProgressPanel
                className="print:hidden"
                steps={getAdvanceStepItems(id)}
                activeStep={2}
            />

            <section className="min-h-[calc(100vh-10rem)] print:min-h-0">
                <AdvanceSummaryCapture
                    advanceRequestId={id}
                    workerName={detail.request.workerName}
                    amountRequested={detail.request.amountRequested}
                    requestDate={detail.request.requestDate}>
                    <AdvanceDownloadVoucher detail={detail} />
                </AdvanceSummaryCapture>
            </section>
        </FormPageLayout>
    );
}
