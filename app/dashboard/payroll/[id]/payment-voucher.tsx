"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";

interface PaymentVoucherProps {
    voucher: {
        voucherNumber: number | null;
        employmentType: string | null;
        monthlyPay: number | null;
        hourlyRate: number | null;
        minimumWorkingHours?: number | null;
        totalHoursWorked: number | null;
        hoursNotMet?: number | null;
        hoursNotMetDeduction?: number | null;
        overtimeHours: number | null;
        overtimePay: number | null;
        restDays: number | null;
        restDayRate: number | null;
        restDayPay: number | null;
        publicHolidays: number | null;
        publicHolidayPay: number | null;
        cpf: number | null;
        advance?: number | null;
        totalPay: number | null;
        netPay: number | null;
        paymentMethod: string | null;
        payNowPhone?: string | null;
        bankAccountNumber?: string | null;
    };
    payroll: {
        id: string;
        periodStart: string;
        periodEnd: string;
        payrollDate: string;
    };
    workerName: string;
    showDownloadButton?: boolean;
}

const currencyFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function fmtQty(n: number, unit: string): string {
    if (unit === "day") return String(Math.round(n));
    return n.toFixed(2);
}

type LineItem = {
    description: string;
    qty?: number;
    unit?: string;
    rate?: number;
    amount: number;
};

export function PaymentVoucher({
    voucher,
    payroll,
    workerName,
    showDownloadButton = true,
}: PaymentVoucherProps) {
    const voucherRootRef = useRef<HTMLDivElement | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    function isoToDdmmyyyy(iso: string): string {
        const s = String(iso).slice(0, 10);
        const [y, m, d] = s.split("-");
        if (!y || !m || !d) return s;
        return `${d}_${m}_${y}`;
    }

    const periodStartDate = new Date(payroll.periodStart + "T00:00:00");
    const periodEndDate = new Date(payroll.periodEnd + "T00:00:00");
    const periodLabel = `${periodStartDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })} to ${periodEndDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })}`;

    const voucherDate = new Date(
        payroll.payrollDate + "T00:00:00",
    ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    const earnings: LineItem[] = [];
    const deductions: LineItem[] = [];
    const isPartTime = voucher.employmentType === "Part Time";

    if (isPartTime) {
        earnings.push({
            description: "Basic Pay",
            qty: voucher.totalHoursWorked ?? 0,
            unit: "hrs",
            rate: voucher.hourlyRate ?? 0,
            amount:
                Math.round(
                    (voucher.totalHoursWorked ?? 0) *
                        (voucher.hourlyRate ?? 0) *
                        100,
                ) / 100,
        });
    } else {
        earnings.push({
            description: `Basic Salary for ${periodLabel}`,
            amount: voucher.monthlyPay ?? 0,
        });

        if (voucher.overtimeHours != null && voucher.overtimeHours > 0) {
            earnings.push({
                description: "Overtime",
                qty: voucher.overtimeHours,
                unit: "hrs",
                rate: voucher.hourlyRate ?? 0,
                amount: voucher.overtimePay ?? 0,
            });
        }

        if (
            voucher.restDays != null &&
            voucher.restDays > 0 &&
            voucher.restDayRate != null
        ) {
            earnings.push({
                description: "Rest Day Pay",
                qty: voucher.restDays,
                unit: "day",
                rate: voucher.restDayRate,
                amount: voucher.restDayPay ?? 0,
            });
        }
    }

    if (
        voucher.publicHolidays != null &&
        voucher.publicHolidays > 0 &&
        voucher.restDayRate != null
    ) {
        earnings.push({
            description: "Public Holiday Pay",
            qty: voucher.publicHolidays,
            unit: "day",
            rate: voucher.restDayRate,
            amount: voucher.publicHolidayPay ?? 0,
        });
    }

    const hoursNotMetItem: LineItem | null =
        voucher.hoursNotMetDeduction != null &&
        voucher.hoursNotMetDeduction !== 0
            ? {
                  description: "Hours Not Met Deduction",
                  qty: Math.abs(voucher.hoursNotMet ?? 0),
                  unit: "hrs",
                  rate: voucher.hourlyRate ?? 0,
                  amount: voucher.hoursNotMetDeduction,
              }
            : null;

    if (voucher.cpf != null && voucher.cpf > 0) {
        deductions.push({
            description: "CPF",
            amount: -voucher.cpf,
        });
    }

    if (voucher.advance != null && voucher.advance > 0) {
        deductions.push({
            description: "Advance Pay",
            amount: -voucher.advance,
        });
    }

    const grossPay = earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = deductions.reduce(
        (sum, item) => sum + item.amount,
        0,
    );
    const subtotalPay =
        voucher.totalPay ?? grossPay + (hoursNotMetItem?.amount ?? 0);
    const netPay =
        voucher.netPay ?? voucher.totalPay ?? grossPay + totalDeductions;

    const baseMethod = voucher.paymentMethod ?? "Cheque / Cash / Bank Transfer";
    const paymentMethodDisplay =
        voucher.paymentMethod === "PayNow" && voucher.payNowPhone
            ? `PayNow (${voucher.payNowPhone})`
            : voucher.paymentMethod === "Bank Transfer" &&
                voucher.bankAccountNumber
              ? `Bank Transfer (${voucher.bankAccountNumber})`
              : baseMethod;

    async function handleDownloadPdf() {
        if (isGenerating) return;

        setIsGenerating(true);
        try {
            const res = await fetch(`/api/payroll/${payroll.id}/pdf?mode=voucher`, {
                method: "GET",
                cache: "no-store",
            });
            if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${workerName} - ${isoToDdmmyyyy(payroll.periodStart)}-${isoToDdmmyyyy(payroll.periodEnd)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div className="space-y-3">
            {showDownloadButton ? (
                <div className="w-full print:hidden">
                    <Button
                        size="lg"
                        className="h-12 w-full text-base"
                        onClick={handleDownloadPdf}
                        disabled={isGenerating}>
                        <Download className="mr-2 h-4 w-4" />
                        {isGenerating ? "Generating…" : "Download PDF"}
                    </Button>
                </div>
            ) : null}

            <div
                ref={voucherRootRef}
                className="voucher-print-root overflow-hidden border border-neutral-300 bg-white text-black print:border-black print:break-inside-avoid print:page-break-after-always">
                {/* Header */}
                <div className="border-b border-neutral-300 px-8 pt-6 pb-4 print:border-black">
                    <h2 className="text-center text-xl font-bold tracking-[0.2em] text-neutral-900">
                        PAYMENT VOUCHER
                    </h2>
                </div>

                <div className="space-y-6 p-8">
                    {/* Metadata table */}
                    <Table className="w-full text-sm">
                        <TableBody>
                            <TableRow className="border-0 hover:bg-white">
                                <TableCell className="py-2 pr-3 text-right font-medium text-black">
                                    Voucher No:
                                </TableCell>
                                <TableCell className="py-2 pl-3 font-semibold text-black">
                                    {voucher.voucherNumber ?? "—"}
                                </TableCell>
                                <TableCell className="py-2 pr-3 text-right font-medium text-black">
                                    Date:
                                </TableCell>
                                <TableCell className="py-2 pl-3 font-semibold text-black">
                                    {voucherDate}
                                </TableCell>
                            </TableRow>
                            <TableRow className="border-0 hover:bg-white">
                                <TableCell className="py-2 pr-3 text-right font-medium text-black">
                                    Pay to:
                                </TableCell>
                                <TableCell className="py-2 pl-3 font-semibold uppercase tracking-wide text-black">
                                    {workerName}
                                </TableCell>
                                <TableCell className="py-2 pr-3 text-right font-medium text-black">
                                    Period:
                                </TableCell>
                                <TableCell className="py-2 pl-3 font-semibold text-black">
                                    {periodLabel}
                                </TableCell>
                            </TableRow>
                            <TableRow className="border-0 hover:bg-white">
                                <TableCell className="py-2 pr-3 text-right font-medium text-black">
                                    Min. Hours:
                                </TableCell>
                                <TableCell className="py-2 pl-3 font-semibold text-black">
                                    {voucher.minimumWorkingHours != null
                                        ? voucher.minimumWorkingHours.toFixed(2)
                                        : "—"}
                                </TableCell>
                                <TableCell className="py-2 pr-3 text-right font-medium text-black">
                                    Hours Worked:
                                </TableCell>
                                <TableCell className="py-2 pl-3 font-semibold text-black">
                                    {voucher.totalHoursWorked != null
                                        ? voucher.totalHoursWorked.toFixed(2)
                                        : "—"}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* Line items table */}
                    <Table className="w-full border-collapse text-sm [&_th]:align-middle [&_td]:align-middle">
                        <TableHeader>
                            <TableRow className="border-y-2 border-black">
                                <TableHead className="py-2 pl-2 text-left font-semibold text-black">
                                    DESCRIPTION
                                </TableHead>
                                <TableHead className="w-[60px] py-2 text-center font-semibold text-black">
                                    QTY
                                </TableHead>
                                <TableHead className="w-[40px] py-2 text-black" />
                                <TableHead className="w-[20px] py-2 text-black" />
                                <TableHead className="w-[80px] py-2 text-center font-semibold text-black">
                                    RATE
                                </TableHead>
                                <TableHead
                                    className="w-[140px] border-l border-black py-2 text-center font-semibold text-black"
                                    colSpan={2}>
                                    AMOUNT
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Earnings */}
                            {earnings.map((item, i) => (
                                <ItemRow key={`e-${i}`} item={item} />
                            ))}

                            {/* Hours not met (before subtotal) */}
                            {hoursNotMetItem && (
                                <ItemRow
                                    key="hours-not-met"
                                    item={hoursNotMetItem}
                                />
                            )}

                            {/* Subtotal */}
                            <TableRow className="border-t border-neutral-400">
                                <TableCell
                                    className="py-2 pl-2 text-left text-xs font-semibold uppercase tracking-wide text-black"
                                    colSpan={5}>
                                    Subtotal
                                </TableCell>
                                <TableCell
                                    className="border-l border-black py-2 pl-3 pr-3 text-right font-semibold"
                                    colSpan={2}>
                                    ${currencyFmt.format(subtotalPay)}
                                </TableCell>
                            </TableRow>

                            {/* Deductions */}
                            {deductions.map((item, i) => (
                                <ItemRow key={`d-${i}`} item={item} />
                            ))}
                        </TableBody>
                        <TableFooter className="bg-white print:bg-white">
                            <TableRow className="border-t-2 border-black hover:bg-white">
                                <TableCell className="py-3 pl-2 text-sm font-semibold" colSpan={1}>
                                    Grand Total
                                </TableCell>
                                <TableCell
                                    className="whitespace-nowrap py-3 pr-4 text-right text-sm"
                                    colSpan={4}>
                                    {paymentMethodDisplay}
                                </TableCell>
                                <TableCell
                                    className="border-l border-black py-3 pl-3 pr-3 text-right text-base font-bold"
                                    colSpan={2}>
                                    ${currencyFmt.format(netPay)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>

                    {/* Signature blocks */}
                    <Table className="w-full text-sm">
                        <TableBody>
                            <TableRow className="border-0 hover:bg-white">
                                <TableCell className="py-2 text-md font-medium text-black">
                                    Payment approved by Alvis Ong Thai Ying
                                </TableCell>
                                <TableCell className="py-2 text-md text-right font-medium text-black">
                                    Payment received by {workerName}
                                </TableCell>
                            </TableRow>
                            <TableRow className="border-0 hover:bg-white">
                                <TableCell className="text-black pt-12">
                                    <div className="w-full max-w-[200px] border-b border-black" />
                                </TableCell>
                                <TableCell className="text-black pt-12">
                                    <div className="ml-auto w-full max-w-[200px] border-b border-black" />
                                </TableCell>
                            </TableRow>
                            <TableRow className="border-0 hover:bg-white">
                                <TableCell className="pt-4 text-md text-black">
                                    Date: <span className="border-b border-neutral-300 px-1">{voucherDate}</span>
                                </TableCell>
                                <TableCell className="pt-4 text-right text-md text-black">
                                    Date: <span className="inline-block w-32 border-b border-neutral-300" />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

function ItemRow({ item }: { item: LineItem }) {
    return (
        <TableRow className="border-b border-neutral-200">
            <TableCell className="py-2 pl-2 font-medium">{item.description}</TableCell>
            <TableCell className="w-[60px] py-2 text-center">
                {item.qty != null ? fmtQty(item.qty, item.unit ?? "") : ""}
            </TableCell>
            <TableCell className="w-[40px] py-2 pl-1">{item.unit ?? ""}</TableCell>
            <TableCell className="w-[20px] py-2 text-center">
                {item.qty != null ? "x" : ""}
            </TableCell>
            <TableCell className="w-[80px] py-2 text-center">
                {item.rate != null ? `$${currencyFmt.format(item.rate)}` : ""}
            </TableCell>
            <TableCell className="w-[20px] border-l border-black py-2 pl-3">$</TableCell>
            <TableCell className="w-[100px] py-2 pr-3 text-right">
                {item.amount < 0 && "-"}
                {currencyFmt.format(Math.abs(item.amount))}
            </TableCell>
        </TableRow>
    );
}
