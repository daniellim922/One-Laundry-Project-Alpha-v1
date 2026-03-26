import { Suspense } from "react";

import { PayrollHeader } from "../payroll-header";
import { PaymentVoucher } from "../payment-voucher";
import { PayrollStepProgress } from "../payroll-step-progress";
import { SummarizedTimesheet } from "../summarized-timesheet";
import { getPayrollDetailData } from "../payroll-detail-data";
import { PayrollSummaryCapture } from "../payroll-summary-capture";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PayrollSummaryPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const sp = (await searchParams) ?? {};
    const mode = typeof sp.mode === "string" ? sp.mode : undefined;
    const { payroll, worker, voucher, entries } = await getPayrollDetailData(id);

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <PayrollHeader payroll={payroll} workerName={worker.name} />
            </div>

            <PayrollStepProgress
                className="print:hidden"
                payrollId={payroll.id}
                payrollStatus={payroll.status}
                activeStep={2}
            />

            <section className="min-h-[calc(100vh-10rem)] print:min-h-0">
                <PayrollSummaryCapture
                    payrollId={payroll.id}
                    workerName={worker.name}
                    periodStart={payroll.periodStart}
                    periodEnd={payroll.periodEnd}>
                    <PaymentVoucher
                        voucher={voucher}
                        payroll={payroll}
                        workerName={worker.name}
                        showDownloadButton={false}
                    />
                    {mode !== "voucher" ? (
                        <SummarizedTimesheet
                            entries={entries}
                            payroll={payroll}
                            workerName={worker.name}
                        />
                    ) : null}
                </PayrollSummaryCapture>
            </section>
        </div>
    );
}
