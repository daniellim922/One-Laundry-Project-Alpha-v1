import { notFound } from "next/navigation";

import { FormPageLayout } from "@/components/form-page-layout";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";
import { requirePermission } from "@/utils/permissions/require-permission";

import { AdvanceStepProgress } from "../advance-step-progress";
import { AdvanceSummaryCapture } from "../advance-summary-capture";
import { AdvancePrintable } from "../advance-printable";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdvanceSummaryPage({ params }: PageProps) {
    await requirePermission("Advance", "read");

    const { id } = await params;
    const detail = await getAdvanceRequestByIdWithWorker(id);
    if (!detail) {
        notFound();
    }

    return (
        <FormPageLayout
            title="Advance request"
            subtitle={`Summary for worker ${detail.request.workerName}`}>
            <AdvanceStepProgress
                className="print:hidden"
                advanceRequestId={id}
                activeStep={2}
            />

            <section className="min-h-[calc(100vh-10rem)] print:min-h-0">
                <AdvanceSummaryCapture
                    advanceRequestId={id}
                    workerName={detail.request.workerName}
                    amountRequested={detail.request.amountRequested}
                    requestDate={detail.request.requestDate}>
                    <AdvancePrintable detail={detail} />
                </AdvanceSummaryCapture>
            </section>
        </FormPageLayout>
    );
}
