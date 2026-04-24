import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SelectPayrollVoucher } from "@/db/tables/payrollVoucherTable";
import type { AdvanceForPayrollPeriod } from "@/utils/advance/queries";
import {
    formatPayrollAdvanceDate,
    payrollAdvanceStatusBadgeClass,
} from "../payroll-advance-display";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import type { PayrollApplicablePublicHoliday } from "@/services/payroll/public-holiday-payroll";
import { formatMoney, isZeroish } from "./format-money";

type Props = {
    payrollId: string;
    payrollStatus: string;
    voucher: SelectPayrollVoucher;
    advances: AdvanceForPayrollPeriod[];
    attendanceRestDays: number;
    applicablePublicHolidays?: PayrollApplicablePublicHoliday[];
};

type LineSign = "+" | "-" | "=" | null;

type LineProps = {
    label: ReactNode;
    subtext?: ReactNode;
    badge?: ReactNode;
    sign?: LineSign;
    amount: number | null;
    dim?: boolean;
    /** When `dim` is on, the row is muted; use this to keep the label at full contrast. */
    labelClassName?: string;
    emphasis?: "none" | "subtotal" | "total";
    valueOverride?: ReactNode;
    /** Green + and amount for positive credit lines (overtime, rest day, PH, etc.) */
    creditGreen?: boolean;
};

function Line({
    label,
    subtext,
    badge,
    sign = null,
    amount,
    dim = false,
    labelClassName,
    emphasis = "none",
    valueOverride,
    creditGreen = false,
}: LineProps) {
    const creditPositive = creditGreen && sign === "+" && !isZeroish(amount);

    return (
        <div
            className={cn(
                "flex items-start justify-between gap-4 py-2.5",
                dim && "text-muted-foreground",
            )}>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p
                        className={cn(
                            "text-base",
                            emphasis !== "none" && "font-semibold",
                            labelClassName,
                        )}>
                        {label}
                    </p>
                    {badge}
                </div>
                {subtext ? (
                    <div className="text-sm text-muted-foreground">
                        {subtext}
                    </div>
                ) : null}
            </div>
            <div
                className={cn(
                    "flex shrink-0 items-center gap-1 text-base tabular-nums",
                    emphasis === "subtotal" && "font-semibold",
                    emphasis === "total" && "text-xl font-semibold",
                )}>
                {sign && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            "w-4 text-right",
                            sign === "+" &&
                                creditGreen &&
                                (creditPositive
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"),
                            sign === "+" &&
                                !creditGreen &&
                                "text-muted-foreground",
                            sign === "-" && "text-muted-foreground",
                        )}>
                        {sign}
                    </span>
                )}
                {valueOverride ?? (
                    <span
                        className={cn(
                            sign === "-" && "text-red-600",
                            sign === "+" &&
                                creditGreen &&
                                (creditPositive
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"),
                        )}>
                        {formatMoney(amount)}
                    </span>
                )}
            </div>
        </div>
    );
}

function Divider({ double = false }: { double?: boolean }) {
    return (
        <div
            className={cn(
                "my-1",
                double ? "border-t-2 border-double" : "border-t",
                "border-border/70",
            )}
        />
    );
}

export function VoucherCalculation({
    payrollId,
    payrollStatus,
    voucher,
    advances,
    attendanceRestDays,
    applicablePublicHolidays = [],
}: Props) {
    const isDraft = payrollStatus === "Draft";
    const voucherRestDays = voucher.restDays ?? 0;
    const restDaysDifferFromAttendance = voucherRestDays !== attendanceRestDays;

    const regularHours = Math.max(
        0,
        (voucher.totalHoursWorked ?? 0) - (voucher.overtimeHours ?? 0),
    );
    const isHourly =
        (voucher.monthlyPay == null || voucher.monthlyPay === 0) &&
        voucher.hourlyRate != null;
    const basePayAmount = isHourly
        ? regularHours * (voucher.hourlyRate ?? 0)
        : (voucher.monthlyPay ?? 0);
    const baseSubtext = isHourly
        ? voucher.hourlyRate != null
            ? `${regularHours.toFixed(2)} hrs x $${voucher.hourlyRate}`
            : `${regularHours.toFixed(2)} hrs`
        : `${voucher.totalHoursWorked ?? 0} / ${
              voucher.minimumWorkingHours ?? 0
          } hrs`;

    return (
        <div className="rounded-lg border bg-muted/10 px-5 py-3 text-base">
            <Line
                label={isHourly ? "Hourly Rate" : "Monthly Pay"}
                subtext={baseSubtext}
                amount={basePayAmount}
            />

            {!isZeroish(voucher.overtimePay) && (
                <Line
                    label="Overtime"
                    subtext={
                        voucher.overtimeHours != null &&
                        voucher.hourlyRate != null
                            ? `${voucher.overtimeHours} hrs × $${voucher.hourlyRate}/hr`
                            : undefined
                    }
                    sign="+"
                    amount={voucher.overtimePay}
                    creditGreen
                />
            )}

            {!isZeroish(voucher.restDayPay) && (
                <Line
                    label="Rest-day premium"
                    sign="+"
                    amount={voucher.restDayPay}
                    creditGreen
                    labelClassName="text-foreground"
                    subtext={
                        <span className="flex flex-wrap items-center gap-2">
                            <span>
                                {voucher.restDays}{" "}
                                {voucher.restDays === 1 ? "day" : "days"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {" "}
                                ×{" "}
                                {voucher.restDayRate != null
                                    ? `$${voucher.restDayRate}`
                                    : "–"}
                                /day
                            </span>
                        </span>
                    }
                />
            )}

            {!isZeroish(voucher.publicHolidayPay) && (
                <Line
                    label={
                        <>
                            <span>Public Holiday Pay</span>
                            {applicablePublicHolidays.length > 0 ? (
                                <span
                                    className={cn(
                                        "font-normal text-muted-foreground",
                                        "ml-2 inline-flex flex-wrap items-center gap-x-1 gap-y-0.5",
                                    )}>
                                    <span aria-hidden="true">·</span>
                                    {applicablePublicHolidays.map((h, i) => (
                                        <span key={h.date}>
                                            {i > 0 ? (
                                                <span aria-hidden="true">
                                                    {" "}
                                                    ·{" "}
                                                </span>
                                            ) : null}
                                            {formatEnGbDmyNumericFromCalendar(
                                                h.date,
                                            )}{" "}
                                            {h.name}
                                        </span>
                                    ))}
                                </span>
                            ) : null}
                        </>
                    }
                    sign="+"
                    amount={voucher.publicHolidayPay}
                    creditGreen
                    labelClassName="text-foreground"
                    subtext={
                        <>
                            <span>
                                {voucher.publicHolidays}{" "}
                                {voucher.publicHolidays === 1
                                    ? "day"
                                    : "days"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {" "}
                                ×{" "}
                                {voucher.restDayRate != null
                                    ? `$${voucher.restDayRate}`
                                    : "–"}
                                /day
                            </span>
                        </>
                    }
                />
            )}

            {!isZeroish(voucher.hoursNotMetDeduction) && (
                <Line
                    label="Hours Not Met"
                    subtext={
                        voucher.hoursNotMet == null
                            ? undefined
                            : voucher.hourlyRate != null ? (
                                  <span className="flex flex-wrap items-center gap-2">
                                      <span>
                                          {`${Math.abs(
                                              voucher.hoursNotMet,
                                          )} hrs short`}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                          × ${voucher.hourlyRate}/hr
                                      </span>
                                  </span>
                              ) : (
                                  `${Math.abs(voucher.hoursNotMet)} hrs short`
                              )
                    }
                    sign="-"
                    amount={Math.abs(voucher.hoursNotMetDeduction ?? 0)}
                />
            )}

            <Divider />

            <Line
                label="Subtotal"
                amount={voucher.subTotal}
                emphasis="subtotal"
            />

            {!isZeroish(voucher.cpf) && (
                <Line label="CPF" sign="-" amount={voucher.cpf} />
            )}

            {advances.length > 0 && (
                <div className="py-2">
                    <p className="text-base">
                        Advance Repayment ({advances.length})
                    </p>
                    <ul className="mt-1 space-y-1">
                        {advances.map((adv) => (
                            <li
                                key={adv.id}
                                className="flex items-center justify-between gap-4 pl-4 text-base text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <span>
                                        {adv.repaymentDate
                                            ? formatPayrollAdvanceDate(
                                                  adv.repaymentDate,
                                              )
                                            : "–"}
                                    </span>
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                            payrollAdvanceStatusBadgeClass[
                                                adv.status
                                            ] ?? "",
                                        )}>
                                        {adv.status}
                                    </span>
                                    <Link
                                        href={`/dashboard/advance/${adv.advanceRequestId}`}
                                        className="text-primary underline-offset-4 hover:underline">
                                        view
                                    </Link>
                                </span>
                                <span className="flex items-center tabular-nums text-red-600">
                                    <span aria-hidden="true" className="mr-px">
                                        −
                                    </span>
                                    {formatMoney(Math.abs(adv.amount))}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Divider double />

            <Line
                label="Grand Total"
                amount={voucher.grandTotal}
                emphasis="total"
            />
        </div>
    );
}
