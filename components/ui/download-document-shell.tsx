import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type PrintableMetadataRow = {
    leftLabel: ReactNode;
    leftValue: ReactNode;
    rightLabel: ReactNode;
    rightValue: ReactNode;
};

interface DownloadDocumentShellProps {
    title: string;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    pageBreakAfter?: boolean;
}

export function DownloadDocumentShell({
    title,
    children,
    className,
    contentClassName,
    pageBreakAfter = false,
}: DownloadDocumentShellProps) {
    return (
        <div
            className={cn(
                "w-full overflow-hidden border border-neutral-300 bg-white text-black print:border-black print:break-inside-avoid",
                pageBreakAfter ? "print:page-break-after-always" : null,
                className,
            )}>
            <div className="border-b border-neutral-300 px-8 pt-6 pb-4 print:border-black">
                <h2 className="text-center text-xl font-bold tracking-[0.2em] text-neutral-900">
                    {title}
                </h2>
            </div>

            <div className={cn("space-y-6 p-8", contentClassName)}>
                {children}
            </div>
        </div>
    );
}

export function DownloadMetadataTable({
    rows,
}: {
    rows: PrintableMetadataRow[];
}) {
    return (
        <Table className="w-full text-sm">
            <TableBody>
                {rows.map((row, index) => (
                    <TableRow key={index} className="border-0 hover:bg-white">
                        <TableCell className="py-2 text-right font-medium text-black">
                            {row.leftLabel}
                        </TableCell>
                        <TableCell className="py-2 font-semibold text-black">
                            {row.leftValue}
                        </TableCell>
                        <TableCell className="py-2 text-right font-medium text-black">
                            {row.rightLabel}
                        </TableCell>
                        <TableCell className="py-2 font-semibold text-black">
                            {row.rightValue}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
