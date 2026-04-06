import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
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

export function AdvancePrintable({ detail }: { detail: AdvanceRequestDetail }) {
    const { request, advances, purpose } = detail;

    const totalAmount = advances.reduce((sum, a) => sum + a.amount, 0);
    const paidCount = advances.filter((a) => a.status === "paid").length;
    const outstandingCount = advances.length - paidCount;

    return (
        <div className="advance-print-root overflow-hidden border border-neutral-300 bg-white text-black print:border-black print:break-inside-avoid">
            {/* Header */}
            <div className="border-b border-neutral-300 px-8 pt-6 pb-4 print:border-black">
                <h2 className="text-center text-xl font-bold tracking-[0.2em] text-neutral-900">
                    ADVANCE REQUEST
                </h2>
            </div>

            <div className="space-y-6 p-8">
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
                    <div className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-600">
                            Employee:
                        </span>
                        <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold uppercase tracking-wide print:border-black">
                            {request.workerName}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-600">
                            Date of Request:
                        </span>
                        <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                            {formatDate(request.requestDate)}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-600">
                            Amount Requested:
                        </span>
                        <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                            ${currencyFmt.format(request.amountRequested)}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-600">
                            Status:
                        </span>
                        <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold capitalize print:border-black">
                            {request.status}
                        </span>
                    </div>
                </div>

                {/* Purpose */}
                {purpose ? (
                    <div className="text-sm">
                        <p className="mb-1 font-medium text-neutral-600">
                            Purpose:
                        </p>
                        <p className="whitespace-pre-wrap rounded border border-neutral-200 bg-neutral-50 px-3 py-2 print:border-black print:bg-transparent">
                            {purpose}
                        </p>
                    </div>
                ) : null}

                {/* Repayment schedule */}
                <div>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-700">
                        Repayment Schedule
                    </p>
                    <Table className="w-full border-collapse text-sm [&_th]:align-middle [&_td]:align-middle">
                        <TableHeader>
                            <TableRow className="border-y-2 border-black">
                                <TableHead className="w-12.5y-2 pl-2 text-neutral-700 text-center font-semibold">
                                    #
                                </TableHead>
                                <TableHead className="py-2 text-left font-semibold text-black-700">
                                    AMOUNT
                                </TableHead>
                                <TableHead className="py-2 text-left font-semibold text-black-700">
                                    REPAYMENT DATE
                                </TableHead>
                                <TableHead className="py-2 text-left font-semibold text-black-700">
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
                            <TableRow className="border-t-2 border-black bg-white">
                                <TableCell className="py-3 pl-2 text-center font-semibold">
                                    {advances.length}
                                </TableCell>
                                <TableCell className="py-3 text-base font-bold">
                                    ${currencyFmt.format(totalAmount)}
                                </TableCell>
                                <TableCell className="py-3" />
                                <TableCell className="py-3 text-xs text-neutral-500">
                                    {paidCount} paid / {outstandingCount}{" "}
                                    outstanding
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                {/* Declaration */}
                <div className="rounded border border-neutral-200 px-4 py-3 text-sm print:border-black">
                    <p className="mb-1 font-semibold text-neutral-700">
                        Employee Acknowledgment
                    </p>
                    <p className="leading-relaxed text-neutral-600 print:text-black">
                        I acknowledge that this advance is a loan and will be
                        repaid according to the agreed terms. I authorize the
                        company to deduct the repayment from my salary as
                        specified.
                    </p>
                </div>

                {/* Signature blocks */}
                <div className="grid grid-cols-2 gap-12 pt-4 text-sm">
                    <div className="space-y-8">
                        <p className="font-medium">Employee signature</p>
                        <div>
                            <div className="w-full max-w-50 border-b border-black" />
                            <div className="mt-3 space-y-1 text-xs text-neutral-500">
                                <p>
                                    Name:{" "}
                                    <span className="inline-block w-32 border-b border-neutral-300" />
                                </p>
                                <p>
                                    Date signed:{" "}
                                    <span className="inline-block w-32 border-b border-neutral-300" />
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8 text-right">
                        <p className="font-medium">Manager&apos;s signature</p>
                        <div>
                            <div className="ml-auto w-full max-w-50 border-b border-black" />
                            <div className="mt-3 space-y-1 text-xs text-neutral-500">
                                <p>
                                    Name:{" "}
                                    <span className="inline-block w-32 border-b border-neutral-300" />
                                </p>
                                <p>
                                    Date signed:{" "}
                                    <span className="inline-block w-32 border-b border-neutral-300" />
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
