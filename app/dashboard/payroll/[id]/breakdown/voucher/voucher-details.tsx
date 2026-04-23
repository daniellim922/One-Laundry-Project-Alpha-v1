"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SelectPayrollVoucher } from "@/db/tables/payrollVoucherTable";
import { VoucherEditableMoney } from "../../voucher-editable-money";
import { VoucherEditableNumber } from "../../voucher-editable-number";

type Props = {
    payrollId: string;
    payrollStatus: string;
    voucher: SelectPayrollVoucher;
};

export function VoucherDetails({
    payrollId,
    payrollStatus,
    voucher,
}: Props) {
    const [open, setOpen] = useState(false);
    const isDraft = payrollStatus === "Draft";
    const isPartTime = voucher.employmentType === "Part Time";
    const partTimeLocked = !isDraft || isPartTime;

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
                    {open ? "Hide payroll voucher" : "Edit payroll voucher"}
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <VoucherEditableMoney
                                payrollId={payrollId}
                                voucherId={voucher.id}
                                label="Monthly Pay"
                                field="monthlyPay"
                                value={voucher.monthlyPay}
                                fullWidth
                                readOnly={partTimeLocked}
                            />
                            <VoucherEditableMoney
                                payrollId={payrollId}
                                voucherId={voucher.id}
                                label="Hourly Rate"
                                field="hourlyRate"
                                value={voucher.hourlyRate}
                                fullWidth
                                readOnly={!isDraft}
                            />
                            <VoucherEditableMoney
                                payrollId={payrollId}
                                voucherId={voucher.id}
                                label="Rest Day Rate"
                                field="restDayRate"
                                value={voucher.restDayRate}
                                fullWidth
                                readOnly={partTimeLocked}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-muted/10 gap-2 py-3">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm font-semibold">
                            Minimum Hours, Rest Days and Public Holidays
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-1">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <VoucherEditableMoney
                                payrollId={payrollId}
                                voucherId={voucher.id}
                                label="Minimum Working Hours"
                                field="minimumWorkingHours"
                                value={voucher.minimumWorkingHours}
                                format="plain"
                                fullWidth
                                readOnly={partTimeLocked}
                            />
                            <VoucherEditableNumber
                                payrollId={payrollId}
                                voucherId={voucher.id}
                                label="Rest days worked"
                                field="restDays"
                                restDays={voucher.restDays}
                                publicHolidays={voucher.publicHolidays}
                                fullWidth
                                readOnly={partTimeLocked}
                            />
                            <VoucherEditableNumber
                                payrollId={payrollId}
                                voucherId={voucher.id}
                                label="Public Holidays"
                                field="publicHolidays"
                                restDays={voucher.restDays}
                                publicHolidays={voucher.publicHolidays}
                                fullWidth
                                readOnly={partTimeLocked}
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

