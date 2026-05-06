import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { FormPageLayout } from "@/components/form-page-layout";
import { StepProgressPanel } from "@/components/ui/step-progress-panel";
import { SummaryCaptureDownload } from "@/components/ui/summary-capture-download";
import { isoToDdmmyyyy } from "@/lib/pdf-filename-parts";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";
import { Pencil } from "lucide-react";

import { AdvanceVoucher } from "../advance-voucher";
import { getAdvanceStepItems } from "../page";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdvanceSummaryPage({ params }: PageProps) {
    const { id } = await params;
    const detail = await getAdvanceRequestByIdWithWorker(id);
    if (!detail) {
        notFound();
    }
    return (
        <FormPageLayout
            title="Advance request"
            subtitle={`Summary for worker ${detail.request.workerName}`}
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
            <StepProgressPanel
                className="print:hidden"
                steps={getAdvanceStepItems(id)}
                activeStep={2}
            />

            <section className="min-h-[calc(100vh-10rem)] print:min-h-0">
                <SummaryCaptureDownload
                    pdfUrl={`/api/advance/${id}/pdf`}
                    filename={`${detail.request.workerName} - Advance - $${detail.request.amountRequested} - ${isoToDdmmyyyy(detail.request.requestDate)}.pdf`}
                    downloadClassName="space-y-3 download-advance">
                    <AdvanceVoucher detail={detail} />
                </SummaryCaptureDownload>
            </section>
        </FormPageLayout>
    );
}
