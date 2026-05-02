import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

interface VoucherSignatureSectionProps {
    approvedLabel: string;
    receivedLabel: string;
    approverName: string;
    receiverName: string;
    approvedDate?: string;
    receivedDate?: string;
    approverSignatureDataUrl?: string | null;
    receiverSignatureDataUrl?: string | null;
}

export function VoucherSignatureSection({
    approvedLabel,
    receivedLabel,
    approverName,
    receiverName,
    approvedDate,
    receivedDate,
    approverSignatureDataUrl,
    receiverSignatureDataUrl,
}: VoucherSignatureSectionProps) {
    return (
        <Table className="w-full text-sm">
            <TableBody>
                <TableRow className="border-0 hover:bg-white">
                    <TableCell className="py-2 text-md font-medium text-black">
                        {approvedLabel} by {approverName}
                    </TableCell>
                    <TableCell className="py-2 text-md text-right font-medium text-black">
                        {receivedLabel} by {receiverName}
                    </TableCell>
                </TableRow>
                <TableRow className="border-0 hover:bg-white">
                    <TableCell className="pt-12 text-black">
                        <div className="flex min-h-[4.5rem] w-full max-w-[200px] flex-col justify-end">
                            {approverSignatureDataUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- printable voucher data URL
                                <img
                                    src={approverSignatureDataUrl}
                                    alt=""
                                    className="mb-1 max-h-16 w-auto max-w-full object-contain object-left"
                                />
                            ) : null}
                            <div className="w-full border-b border-black" />
                        </div>
                    </TableCell>
                    <TableCell className="pt-12 text-black">
                        <div className="ml-auto flex min-h-[4.5rem] w-full max-w-[200px] flex-col justify-end">
                            {receiverSignatureDataUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- printable voucher data URL
                                <img
                                    src={receiverSignatureDataUrl}
                                    alt=""
                                    className="mb-1 max-h-16 w-auto max-w-full object-contain object-right"
                                />
                            ) : null}
                            <div className="ml-auto w-full border-b border-black" />
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow className="border-0 hover:bg-white">
                    <TableCell className="pt-4 text-md text-black">
                        Date:{" "}
                        {approvedDate ? (
                            <span className="border-b border-neutral-300 px-1">
                                {approvedDate}
                            </span>
                        ) : (
                            <span className="inline-block w-32 border-b border-neutral-300" />
                        )}
                    </TableCell>
                    <TableCell className="pt-4 text-right text-md text-black">
                        Date:{" "}
                        {receivedDate ? (
                            <span className="border-b border-neutral-300 px-1">
                                {receivedDate}
                            </span>
                        ) : (
                            <span className="inline-block w-32 border-b border-neutral-300" />
                        )}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
