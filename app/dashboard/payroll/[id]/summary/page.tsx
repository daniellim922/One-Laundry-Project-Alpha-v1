import { Suspense } from "react";

import { PayrollHeader } from "../payroll-header";
import { PaymentVoucher } from "../payment-voucher";
import { PayrollStepProgress } from "../payroll-step-progress";
import { PayrollSummaryPrintTrigger } from "../payroll-summary-print-trigger";
import { SummarizedTimesheet } from "../summarized-timesheet";
import { getPayrollDetailData } from "../payroll-detail-data";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PayrollSummaryPage({ params }: PageProps) {
    const { id } = await params;
    const { payroll, worker, voucher, entries } = await getPayrollDetailData(id);

    return (
        <div className="space-y-6">
            <Suspense fallback={null}>
                <PayrollSummaryPrintTrigger
                    workerName={worker.name}
                    periodStart={payroll.periodStart}
                    periodEnd={payroll.periodEnd}
                />
            </Suspense>
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
                <div className="space-y-3 printable-payroll print:bg-white">
                    <PaymentVoucher
                        voucher={voucher}
                        payroll={payroll}
                        workerName={worker.name}
                    />
                    <SummarizedTimesheet
                        entries={entries}
                        payroll={payroll}
                        workerName={worker.name}
                    />
                </div>
            </section>
        </div>
    );
}
