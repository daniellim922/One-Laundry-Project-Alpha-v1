"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        periodStart: string;
        periodEnd: string;
        payrollDate: string;
    };
    workerName: string;
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
}: PaymentVoucherProps) {
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
    const netPay = voucher.netPay ?? voucher.totalPay ?? grossPay + totalDeductions;

    const baseMethod =
        voucher.paymentMethod ?? "Cheque / Cash / Bank Transfer";
    const paymentMethodDisplay =
        voucher.paymentMethod === "PayNow" && voucher.payNowPhone
            ? `PayNow (${voucher.payNowPhone})`
            : voucher.paymentMethod === "Bank Transfer" &&
                voucher.bankAccountNumber
              ? `Bank Transfer (${voucher.bankAccountNumber})`
              : baseMethod;

    function handlePrint() {
        const originalTitle = document.title;
        const safeName = workerName.replace(/[/\\:*?"<>|]/g, "-");
        const customTitle = `${safeName}: ${payroll.periodStart}-${payroll.periodEnd}`;

        const beforePrint = () => {
            document.title = customTitle;
        };
        const afterPrint = () => {
            document.title = originalTitle;
            window.removeEventListener("beforeprint", beforePrint);
            window.removeEventListener("afterprint", afterPrint);
        };

        window.addEventListener("beforeprint", beforePrint);
        window.addEventListener("afterprint", afterPrint);
        document.title = customTitle;
        requestAnimationFrame(() => {
            setTimeout(() => window.print(), 100);
        });
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-end print:hidden">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Voucher
                </Button>
            </div>

            <div className="voucher-print-root overflow-hidden border border-neutral-300 bg-white text-black print:border-black print:break-inside-avoid print:page-break-after-always">
                {/* Header */}
                <div className="border-b border-neutral-300 px-8 pt-6 pb-4 print:border-black">
                    <h2 className="text-center text-xl font-bold tracking-[0.2em] text-neutral-900">
                        PAYMENT VOUCHER
                    </h2>
                </div>

                <div className="space-y-6 p-8">
                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-600">
                                Voucher No:
                            </span>
                            <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                                {voucher.voucherNumber ?? "—"}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-600">
                                Date:
                            </span>
                            <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                                {voucherDate}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-600">
                                Pay to:
                            </span>
                            <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold uppercase tracking-wide print:border-black">
                                {workerName}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-600">
                                Period:
                            </span>
                            <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                                {periodLabel}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-600">
                                Min. Hours:
                            </span>
                            <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                                {voucher.minimumWorkingHours != null
                                    ? voucher.minimumWorkingHours.toFixed(2)
                                    : "—"}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-600">
                                Hours Worked:
                            </span>
                            <span className="border-b border-neutral-400 px-2 pb-0.5 font-semibold print:border-black">
                                {voucher.totalHoursWorked != null
                                    ? voucher.totalHoursWorked.toFixed(2)
                                    : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Line items table */}
                    <table className="w-full border-collapse text-sm [&_th]:align-middle [&_td]:align-middle">
                        <thead>
                            <tr className="border-y-2 border-black">
                                <th className="py-2 pl-2 text-left font-semibold">
                                    DESCRIPTION
                                </th>
                                <th className="w-[60px] py-2 text-center font-semibold">
                                    QTY
                                </th>
                                <th className="w-[40px] py-2" />
                                <th className="w-[20px] py-2" />
                                <th className="w-[80px] py-2 text-center font-semibold">
                                    RATE
                                </th>
                                <th
                                    className="w-[140px] border-l border-black py-2 text-center font-semibold"
                                    colSpan={2}>
                                    AMOUNT
                                </th>
                            </tr>
                        </thead>
                        <tbody>
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
                            <tr className="border-t border-neutral-400">
                                <td
                                    className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500"
                                    colSpan={5}>
                                    Subtotal
                                </td>
                                <td
                                    className="border-l border-black py-2 pl-3 pr-3 text-right font-semibold"
                                    colSpan={2}>
                                    ${currencyFmt.format(subtotalPay)}
                                </td>
                            </tr>

                            {/* Deductions */}
                            {deductions.map((item, i) => (
                                <ItemRow key={`d-${i}`} item={item} />
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black">
                                <td className="py-3 pl-2 text-sm" colSpan={1}>
                                    A/c
                                </td>
                                <td
                                    className="min-w-[200px] whitespace-nowrap py-3 pl-4 text-sm"
                                    colSpan={4}>
                                    {paymentMethodDisplay}
                                </td>
                                <td
                                    className="border-l border-black py-3 pl-3 pr-3 text-right text-base font-bold"
                                    colSpan={2}>
                                    ${currencyFmt.format(netPay)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Signature blocks */}
                    <div className="grid grid-cols-2 gap-12 pt-4 text-sm">
                        <div className="space-y-8">
                            <p className="font-medium">Payment approved by</p>
                            <div>
                                <div className="w-full max-w-[200px] border-b border-black" />
                                <div className="mt-3 space-y-1 text-xs text-neutral-500">
                                    <p>
                                        Name:{" "}
                                        <span className="inline-block w-32 border-b border-neutral-300" />
                                    </p>
                                    <p>
                                        Date:{" "}
                                        <span className="inline-block w-32 border-b border-neutral-300" />
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8 text-right">
                            <p className="font-medium">Payment received by</p>
                            <div>
                                <div className="ml-auto w-full max-w-[200px] border-b border-black" />
                                <div className="mt-3 space-y-1 text-xs text-neutral-500">
                                    <p>
                                        Name:{" "}
                                        <span className="inline-block w-32 border-b border-neutral-300" />
                                    </p>
                                    <p>
                                        Date:{" "}
                                        <span className="inline-block w-32 border-b border-neutral-300" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ItemRow({ item }: { item: LineItem }) {
    return (
        <tr className="border-b border-neutral-200">
            <td className="py-2 pl-2 font-medium">{item.description}</td>
            <td className="w-[60px] py-2 text-center">
                {item.qty != null ? fmtQty(item.qty, item.unit ?? "") : ""}
            </td>
            <td className="w-[40px] py-2 pl-1">{item.unit ?? ""}</td>
            <td className="w-[20px] py-2 text-center">
                {item.qty != null ? "x" : ""}
            </td>
            <td className="w-[80px] py-2 text-center">
                {item.rate != null ? `$${currencyFmt.format(item.rate)}` : ""}
            </td>
            <td className="w-[20px] border-l border-black py-2 pl-3">$</td>
            <td className="w-[100px] py-2 pr-3 text-right">
                {item.amount < 0 && "-"}
                {currencyFmt.format(Math.abs(item.amount))}
            </td>
        </tr>
    );
}
