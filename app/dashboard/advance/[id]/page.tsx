import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    advanceStatusBadgeClass,
    formatAdvanceAmount,
    formatAdvanceDate,
} from "@/lib/advance-display";
import { getAdvanceByIdWithWorker } from "@/lib/advances-queries";

export default async function AdvanceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const advance = await getAdvanceByIdWithWorker(id);
    if (!advance) {
        notFound();
    }

    return (
        <div className="space-y-6" data-testid="advance-detail">
            <div className="flex items-center gap-3">
                <BackButton href="/dashboard/advance" />
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Advance loan
                    </h1>
                    <p className="text-muted-foreground">
                        Detail for worker {advance.workerName}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Loan details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-sm">Worker</p>
                        <Link
                            href={`/dashboard/workers/${advance.workerId}/view`}
                            className="font-medium text-primary underline-offset-4 hover:underline">
                            {advance.workerName}
                        </Link>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm">Amount</p>
                        <p
                            className="font-medium"
                            data-testid="advance-detail-amount">
                            {formatAdvanceAmount(advance.amount)}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm">Status</p>
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                advanceStatusBadgeClass[advance.status] ?? ""
                            }`}
                            data-testid="advance-detail-status">
                            {advance.status}
                        </span>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm">Loan date</p>
                        <p data-testid="advance-detail-loan-date">
                            {formatAdvanceDate(advance.loanDate)}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm">
                            Repayment date
                        </p>
                        <p data-testid="advance-detail-repayment-date">
                            {advance.repaymentDate
                                ? formatAdvanceDate(advance.repaymentDate)
                                : "—"}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
