"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentVoucherProps {
    voucher: {
        voucherNumber: number | null;
        employmentType: string | null;
        monthlyPay: number | null;
        hourlyRate: number | null;
        totalHoursWorked: number | null;
        overtimeHours: number | null;
        overtimePay: number | null;
        restDays: number | null;
        restDayRate: number | null;
        restDayPay: number | null;
        cpf: number | null;
        totalPay: number | null;
        paymentMethod: string | null;
    };
    payroll: {
        periodStart: string;
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

export function PaymentVoucher({
    voucher,
    payroll,
    workerName,
}: PaymentVoucherProps) {
    const periodDate = new Date(payroll.periodStart + "T00:00:00");
    const periodLabel = periodDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    const voucherDate = new Date(
        payroll.payrollDate + "T00:00:00",
    ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    type LineItem = {
        description: string;
        qty?: number;
        unit?: string;
        rate?: number;
        amount: number;
    };

    const items: LineItem[] = [];
    const isPartTime = voucher.employmentType === "Part Time";

    if (isPartTime) {
        items.push({
            description: "Basic Pay",
            qty: voucher.totalHoursWorked ?? 0,
            unit: "hrs",
            rate: voucher.hourlyRate ?? 0,
            amount:
                Math.round(
                    (voucher.totalHoursWorked ?? 0) * (voucher.hourlyRate ?? 0) * 100,
                ) / 100,
        });
    } else {
        items.push({
            description: `Basic Salary for ${periodLabel}`,
            amount: voucher.monthlyPay ?? 0,
        });

        if (voucher.overtimeHours != null && voucher.overtimeHours > 0) {
            items.push({
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
            items.push({
                description: "Rest Day Pay",
                qty: voucher.restDays,
                unit: "day",
                rate: voucher.restDayRate,
                amount: voucher.restDayPay ?? 0,
            });
        }
    }

    if (voucher.cpf != null && voucher.cpf > 0) {
        items.push({
            description: "CPF",
            amount: -voucher.cpf,
        });
    }

    const paymentMethodDisplay =
        voucher.paymentMethod ?? "Cheque/ Cash/ Bank Transfer";

    const emptyRowCount = Math.max(0, 4 - items.length);

    return (
        <div className="space-y-3">
            <div className="flex justify-end print:hidden">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Voucher
                </Button>
            </div>

            <div className="overflow-hidden border border-neutral-400 bg-white text-black print:border-black print:break-inside-avoid">
                <div className="border-b-2 border-neutral-800 bg-neutral-800 py-3 text-center">
                    <h2 className="text-lg font-bold tracking-widest text-white">
                        PAYMENT VOUCHER
                    </h2>
                </div>

                <div className="space-y-6 p-8">
                    <div className="flex justify-end">
                        <div className="space-y-2 text-sm">
                            <div className="flex items-baseline gap-2">
                                <span>Voucher No:</span>
                                <span className="inline-block min-w-[120px] border-b border-black text-center font-medium">
                                    {voucher.voucherNumber ?? ""}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="ml-auto">Date:</span>
                                <span className="inline-block min-w-[120px] border-b border-black text-center font-medium">
                                    {voucherDate}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-3">
                        <span className="whitespace-nowrap text-sm font-medium">
                            PAY TO:
                        </span>
                        <span className="flex-1 border-b border-black pb-0.5 text-base font-semibold uppercase tracking-wide">
                            {workerName}
                        </span>
                    </div>

                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-y-2 border-black">
                                <th
                                    className="py-2 text-center font-semibold"
                                    colSpan={5}>
                                    DESCRIPTION
                                </th>
                                <th
                                    className="w-[140px] border-l border-black py-2 text-center font-semibold"
                                    colSpan={2}>
                                    AMOUNT
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={7} className="h-2" />
                            </tr>
                            {items.map((item, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-neutral-300">
                                    <td className="py-2 pl-2 font-medium">
                                        {item.description}
                                    </td>
                                    <td className="w-[60px] py-2 text-right">
                                        {item.qty != null
                                            ? fmtQty(
                                                  item.qty,
                                                  item.unit ?? "",
                                              )
                                            : ""}
                                    </td>
                                    <td className="w-[40px] py-2 pl-1">
                                        {item.unit ?? ""}
                                    </td>
                                    <td className="w-[20px] py-2 text-center">
                                        {item.qty != null ? "x" : ""}
                                    </td>
                                    <td className="w-[80px] py-2 text-right">
                                        {item.rate != null
                                            ? `$${currencyFmt.format(item.rate)}`
                                            : ""}
                                    </td>
                                    <td className="w-[20px] border-l border-black py-2 pl-3">
                                        $
                                    </td>
                                    <td className="w-[100px] py-2 pr-3 text-right">
                                        {item.amount < 0 && "-"}
                                        {currencyFmt.format(
                                            Math.abs(item.amount),
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {Array.from({ length: emptyRowCount }).map(
                                (_, i) => (
                                    <tr
                                        key={`empty-${i}`}
                                        className="border-b border-neutral-300">
                                        <td className="py-2" colSpan={5}>
                                            &nbsp;
                                        </td>
                                        <td className="border-l border-black py-2" />
                                        <td className="py-2" />
                                    </tr>
                                ),
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black">
                                <td className="py-3 pl-2 text-sm" colSpan={2}>
                                    A/c
                                </td>
                                <td className="py-3 text-sm" colSpan={3}>
                                    {paymentMethodDisplay}
                                </td>
                                <td className="border-l border-black py-3 pl-3 font-bold">
                                    $
                                </td>
                                <td className="py-3 pr-3 text-right font-bold">
                                    {currencyFmt.format(
                                        voucher.totalPay ?? 0,
                                    )}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="flex justify-between pt-4 text-sm">
                        <div className="space-y-10">
                            <p className="font-medium">Payment approved by</p>
                            <div className="w-48 border-b border-black" />
                        </div>
                        <div className="space-y-10 text-right">
                            <p className="font-medium">
                                Payment received by:
                            </p>
                            <div className="ml-auto w-48 border-b border-black" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
