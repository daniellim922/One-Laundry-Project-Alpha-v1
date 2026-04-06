import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import {
    DownloadDocumentShell,
    DownloadMetadataTable,
} from "@/components/ui/download-document-shell";
import { VoucherSignatureSection } from "@/components/ui/signature-section";
import type { AdvanceRequestDetail } from "@/utils/advance/queries";

const currencyFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function AdvanceDownloadVoucher({
    detail,
}: {
    detail: AdvanceRequestDetail;
}) {
    const { request, advances } = detail;

    const totalAmount = advances.reduce((sum, a) => sum + a.amount, 0);
    const paidCount = advances.filter((a) => a.status === "paid").length;
    const outstandingCount = advances.length - paidCount;

    return (
        <DownloadDocumentShell
            title="ADVANCE REQUEST"
            className="voucher-download-root">
            <DownloadMetadataTable
                rows={[
                    {
                        leftLabel: "Employee:",
                        leftValue: (
                            <span className="uppercase tracking-wide">
                                {request.workerName}
                            </span>
                        ),
                        rightLabel: "Date of Request:",
                        rightValue: formatDate(request.requestDate),
                    },
                    {
                        leftLabel: "Amount Requested:",
                        leftValue: `$${currencyFmt.format(request.amountRequested)}`,
                        rightLabel: "Status:",
                        rightValue: (
                            <span className="capitalize">{request.status}</span>
                        ),
                    },
                ]}
            />

            {/* Repayment schedule */}
            <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Repayment Schedule
                </p>
                <Table className="w-full border-collapse text-sm [&_th]:align-middle [&_td]:align-middle">
                    <TableHeader>
                        <TableRow className="border-y-2 border-black">
                            <TableHead className="w-12.5 py-2 pl-2 text-center font-semibold text-black">
                                #
                            </TableHead>
                            <TableHead className="py-2 text-left font-semibold text-black">
                                AMOUNT
                            </TableHead>
                            <TableHead className="py-2 text-left font-semibold text-black">
                                REPAYMENT DATE
                            </TableHead>
                            <TableHead className="py-2 text-left font-semibold text-black">
                                STATUS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {advances.map((adv, i) => (
                            <TableRow
                                key={adv.id}
                                className="border-b border-neutral-200">
                                <TableCell className="py-2 pl-2 text-center">
                                    {i + 1}
                                </TableCell>
                                <TableCell className="py-2 font-medium">
                                    ${currencyFmt.format(adv.amount)}
                                </TableCell>
                                <TableCell className="py-2">
                                    {formatDate(adv.repaymentDate)}
                                </TableCell>
                                <TableCell className="py-2 capitalize">
                                    {adv.status}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="border-t-2 border-black bg-white hover:bg-white print:bg-white">
                            <TableCell className="py-3 pl-2 text-center font-semibold"></TableCell>
                            <TableCell className="py-3 text-base font-bold">
                                ${currencyFmt.format(totalAmount)}
                            </TableCell>
                            <TableCell className="py-3" />
                            <TableCell className="py-3 text-xs">
                                {paidCount} paid / {outstandingCount}{" "}
                                outstanding
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Declaration */}
            <div className="rounded border-neutral-200 px-4 py-3 text-sm">
                <p className="mb-1 font-semibold text-neutral-700">
                    Employee Acknowledgment
                </p>
                <p className="leading-relaxed text-neutral-600 print:text-black">
                    I acknowledge that this advance is a loan and will be repaid
                    according to the agreed terms. I authorize the company to
                    deduct the repayment from my salary as specified.
                </p>
            </div>

            <VoucherSignatureSection
                approvedLabel="Advance approved"
                receivedLabel="Advance received"
                approverName="Alvis Ong Thai Ying"
                receiverName={request.workerName}
                approvedDate={formatDate(request.requestDate)}
            />
        </DownloadDocumentShell>
    );
}
