import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

interface VoucherSignatureSectionProps {
    approvedLabel: string;
    receivedLabel: string;
    approverName: string;
    receiverName: string;
    approvedDate?: string;
}

export function VoucherSignatureSection({
    approvedLabel,
    receivedLabel,
    approverName,
    receiverName,
    approvedDate,
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
                        <div className="w-full max-w-[200px] border-b border-black" />
                    </TableCell>
                    <TableCell className="pt-12 text-black">
                        <div className="ml-auto w-full max-w-[200px] border-b border-black" />
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
                        <span className="inline-block w-32 border-b border-neutral-300" />
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
