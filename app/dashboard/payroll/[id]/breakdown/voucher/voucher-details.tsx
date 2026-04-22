"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SelectPayrollVoucher } from "@/db/tables/payrollVoucherTable";
import type { AdvanceForPayrollPeriod } from "@/utils/advance/queries";
import {
    formatPayrollAdvanceDate,
    payrollAdvanceStatusBadgeClass,
} from "../payroll-advance-display";
import { VoucherEditableNumber } from "../../voucher-editable-number";

type Props = {
    payrollId: string;
    payrollStatus: string;
    voucher: SelectPayrollVoucher;
    advances: AdvanceForPayrollPeriod[];
    attendanceRestDays: number;
};

export function VoucherDetails({
    payrollId,
    payrollStatus,
    voucher,
    advances,
    attendanceRestDays,
}: Props) {
    const [open, setOpen] = useState(false);
    const isDraft = payrollStatus === "Draft";
    const voucherRestDaysForCompare = voucher.restDays ?? 0;
    const restDaysDifferFromAttendance =
        voucherRestDaysForCompare !== attendanceRestDays;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    className="flex w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    {open ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                    {open ? "Hide full voucher" : "Show full voucher"}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Employment & Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <Field
                                label="Employment Type"
                                value={voucher.employmentType}
                            />
                            <Field
                                label="Employment Arrangement"
                                value={voucher.employmentArrangement}
                            />
                            <Field
                                label="Payment Method"
                                value={voucher.paymentMethod}
                            />
                            <Field
                                label={
                                    voucher.paymentMethod === "PayNow"
                                        ? "PayNow"
                                        : voucher.paymentMethod ===
                                            "Bank Transfer"
                                          ? "Bank Account"
                                          : "PayNow/Bank Account"
                                }
                                value={
                                    voucher.paymentMethod === "PayNow"
                                        ? voucher.payNowPhone
                                        : voucher.paymentMethod ===
                                            "Bank Transfer"
                                          ? voucher.bankAccountNumber
                                          : (voucher.payNowPhone ??
                                            voucher.bankAccountNumber)
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Pay Rates
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <Field
                                label="Monthly Pay"
                                value={money(voucher.monthlyPay)}
                            />
                            <Field
                                label="Hourly Rate"
                                value={money(voucher.hourlyRate)}
                            />
                            <div className="md:col-span-2">
                                <Field
                                    label="Rest Day Rate"
                                    value={money(voucher.restDayRate)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Hours & Overtime
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="md:col-span-2">
                                <Field
                                    label="Total Hours Worked"
                                    value={voucher.totalHoursWorked}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Field
                                    label="Minimum Working Hours"
                                    value={voucher.minimumWorkingHours}
                                />
                            </div>
                            <Field
                                label="Hours Not Met"
                                value={voucher.hoursNotMet}
                                valueClassName={cn(
                                    voucher.hoursNotMet != null &&
                                        Number(voucher.hoursNotMet) !== 0 &&
                                        "text-red-600",
                                )}
                            />
                            <Field
                                label="Hours Not Met Deduction"
                                value={
                                    voucher.hoursNotMetDeduction != null
                                        ? voucher.hoursNotMetDeduction < 0
                                            ? `-$${Math.abs(
                                                  voucher.hoursNotMetDeduction,
                                              )}`
                                            : `$${voucher.hoursNotMetDeduction}`
                                        : null
                                }
                                valueClassName={cn(
                                    voucher.hoursNotMetDeduction != null &&
                                        Number(voucher.hoursNotMetDeduction) !==
                                            0 &&
                                        "text-red-600",
                                )}
                            />
                            <Field
                                label="Overtime Hours"
                                value={voucher.overtimeHours}
                                valueClassName={cn(
                                    voucher.overtimeHours != null &&
                                        Number(voucher.overtimeHours) !== 0 &&
                                        "text-emerald-600",
                                )}
                            />
                            <Field
                                label="Overtime Pay"
                                value={money(voucher.overtimePay)}
                                valueClassName={cn(
                                    voucher.overtimePay != null &&
                                        Number(voucher.overtimePay) !== 0 &&
                                        "text-emerald-600",
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Rest Days & Holidays
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="space-y-1">
                                <VoucherEditableNumber
                                    payrollId={payrollId}
                                    voucherId={voucher.id}
                                    label="Rest Days"
                                    field="restDays"
                                    restDays={voucher.restDays}
                                    publicHolidays={voucher.publicHolidays}
                                    readOnly={!isDraft}
                                />
                                <p className="text-xs text-muted-foreground">
                                    From attendance: {attendanceRestDays}
                                    {restDaysDifferFromAttendance ? (
                                        <span className="block mt-1 text-muted-foreground/90">
                                            Voucher differs from this figure
                                            (manual adjustment).
                                        </span>
                                    ) : null}
                                </p>
                            </div>
                            <Field
                                label="Rest Day Pay"
                                value={money(voucher.restDayPay)}
                            />
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        Public Holidays
                                    </p>
                                    <Badge variant="secondary">Computed</Badge>
                                </div>
                                <p className="text-sm font-medium">
                                    {voucher.publicHolidays ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    From the shared public holiday calendar
                                </p>
                            </div>
                            <Field
                                label="Public Holiday Pay"
                                value={money(voucher.publicHolidayPay)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Advances
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        {advances.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No advances due in this period.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Repayment Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Advance Request</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {advances.map((adv) => (
                                        <TableRow key={adv.id}>
                                            <TableCell>
                                                {adv.repaymentDate
                                                    ? formatPayrollAdvanceDate(
                                                          adv.repaymentDate,
                                                      )
                                                    : "–"}
                                            </TableCell>
                                            <TableCell>
                                                {`$${adv.amount}`}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        payrollAdvanceStatusBadgeClass[
                                                            adv.status
                                                        ] ?? ""
                                                    }`}>
                                                    {adv.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/dashboard/advance/${adv.advanceRequestId}`}
                                                    className="text-primary text-sm underline-offset-4 hover:underline">
                                                    View
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Totals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        <div className="grid grid-cols-4 gap-4">
                            <Field
                                label="Total Pay"
                                value={money(voucher.totalPay)}
                            />
                            <Field label="CPF" value={money(voucher.cpf)} />
                            <Field
                                label="Advance"
                                value={money(voucher.advance)}
                            />
                            <Field
                                label="Net Pay"
                                value={money(voucher.netPay)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
}

function Field({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: string | number | null | undefined;
    valueClassName?: string;
}) {
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("text-sm font-medium", valueClassName)}>
                {value == null || value === "" ? "–" : value}
            </p>
        </div>
    );
}

function money(value: number | null | undefined): string | null {
    if (value == null) return null;
    return `$${value}`;
}
