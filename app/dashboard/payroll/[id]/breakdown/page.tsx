import Link from "next/link";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";

import {
    formatPayrollAdvanceDate,
    payrollAdvanceStatusBadgeClass,
} from "./payroll-advance-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TimesheetPaymentStatus } from "@/types/status";
import { timesheetPaymentStatusBadgeTone } from "@/types/badge-tones";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import { localTimeHm } from "@/utils/time/local-time";
import { cn } from "@/lib/utils";
import { getPayrollDetailData } from "../payroll-detail-data";
import { PayrollHeader } from "../payroll-header";
import { PayrollStepProgress } from "../payroll-step-progress";
import { VoucherEditableNumber } from "../voucher-editable-number";
import { Badge } from "@/components/ui/badge";

interface PageProps {
    params: Promise<{ id: string }>;
}

const formatDate = formatEnGbDmyNumericFromCalendar;
const formatTime = localTimeHm;

export default async function PayrollBreakdownPage({ params }: PageProps) {
    const { id } = await params;
    const {
        payroll,
        worker,
        employment,
        voucher,
        entries,
        missingDateIns,
        advances,
    } = await getPayrollDetailData(id);

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <PayrollHeader payroll={payroll} workerName={worker.name} />
            </div>

            <PayrollStepProgress
                className="print:hidden"
                payrollId={payroll.id}
                payrollStatus={payroll.status}
                activeStep={1}
            />

            <section className="space-y-6 min-h-[calc(100vh-10rem)] print:hidden">
                <Card className="print:hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>Employment breakdown</CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    aria-label="Worker actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/worker/${worker.id}/view`}>
                                        <Eye className="h-4 w-4" />
                                        View
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/worker/${worker.id}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Employment Type
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.employmentType}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Employment Arrangement
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.employmentArrangement}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Monthly Pay
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.monthlyPay != null
                                            ? `$${employment.monthlyPay}`
                                            : "–"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Hourly Rate
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.hourlyRate != null
                                            ? `$${employment.hourlyRate}`
                                            : "–"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Rest Day Rate
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.restDayRate != null
                                            ? `$${employment.restDayRate}`
                                            : "–"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Minimum Working Hours
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.minimumWorkingHours ?? "–"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Payment Method
                                    </p>
                                    <p className="text-sm font-medium">
                                        {employment.paymentMethod ?? "–"}
                                    </p>
                                </div>
                                {employment.paymentMethod === "PayNow" &&
                                    employment.payNowPhone && (
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">
                                                PayNow Phone
                                            </p>
                                            <p className="text-sm font-medium">
                                                {employment.payNowPhone}
                                            </p>
                                        </div>
                                    )}
                                {employment.paymentMethod === "Bank Transfer" &&
                                    employment.bankAccountNumber && (
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">
                                                Bank Account
                                            </p>
                                            <p className="text-sm font-medium">
                                                {employment.bankAccountNumber}
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>Payroll Voucher</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Snapshot of employment terms at payroll generation
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Card className="border bg-muted/10 gap-2 py-3">
                            <CardHeader className="px-4 pb-0">
                                <CardTitle className="text-sm font-semibold">
                                    Employment & Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pt-1">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Employment Type
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.employmentType ?? "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Employment Arrangement
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.employmentArrangement ??
                                                "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Payment Method
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.paymentMethod ?? "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            {voucher.paymentMethod === "PayNow"
                                                ? "PayNow Phone"
                                                : voucher.paymentMethod ===
                                                    "Bank Transfer"
                                                  ? "Bank Account"
                                                  : "PayNow/Bank Account"}
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.paymentMethod === "PayNow"
                                                ? (voucher.payNowPhone ?? "–")
                                                : voucher.paymentMethod ===
                                                    "Bank Transfer"
                                                  ? (voucher.bankAccountNumber ??
                                                    "–")
                                                  : (voucher.payNowPhone ??
                                                    voucher.bankAccountNumber ??
                                                    "–")}
                                        </p>
                                    </div>
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
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Monthly Pay
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.monthlyPay != null
                                                ? `$${voucher.monthlyPay}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Hourly Rate
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.hourlyRate != null
                                                ? `$${voucher.hourlyRate}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <p className="text-sm text-muted-foreground">
                                            Rest Day Rate
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.restDayRate != null
                                                ? `$${voucher.restDayRate}`
                                                : "–"}
                                        </p>
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
                                    <div className="space-y-1 md:col-span-2">
                                        <p className="text-sm text-muted-foreground">
                                            Total Hours Worked
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.totalHoursWorked ?? "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <p className="text-sm text-muted-foreground">
                                            Minimum Working Hours
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.minimumWorkingHours ?? "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Hours Not Met
                                        </p>
                                        <p
                                            className={cn(
                                                "text-sm font-medium",
                                                voucher.hoursNotMet != null &&
                                                    Number(
                                                        voucher.hoursNotMet,
                                                    ) !== 0 &&
                                                    "text-red-600",
                                            )}>
                                            {voucher.hoursNotMet ?? "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Hours Not Met Deduction
                                        </p>
                                        <p
                                            className={cn(
                                                "text-sm font-medium",
                                                voucher.hoursNotMetDeduction !=
                                                    null &&
                                                    Number(
                                                        voucher.hoursNotMetDeduction,
                                                    ) !== 0 &&
                                                    "text-red-600",
                                            )}>
                                            {voucher.hoursNotMetDeduction !=
                                            null
                                                ? voucher.hoursNotMetDeduction <
                                                  0
                                                    ? `-$${Math.abs(voucher.hoursNotMetDeduction)}`
                                                    : `$${voucher.hoursNotMetDeduction}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Overtime Hours
                                        </p>
                                        <p
                                            className={cn(
                                                "text-sm font-medium",
                                                voucher.overtimeHours != null &&
                                                    Number(
                                                        voucher.overtimeHours,
                                                    ) !== 0 &&
                                                    "text-emerald-600",
                                            )}>
                                            {voucher.overtimeHours ?? "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Overtime Pay
                                        </p>
                                        <p
                                            className={cn(
                                                "text-sm font-medium",
                                                voucher.overtimePay != null &&
                                                    Number(
                                                        voucher.overtimePay,
                                                    ) !== 0 &&
                                                    "text-emerald-600",
                                            )}>
                                            {voucher.overtimePay != null
                                                ? `$${voucher.overtimePay}`
                                                : "–"}
                                        </p>
                                    </div>
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
                                    <VoucherEditableNumber
                                        payrollId={payroll.id}
                                        voucherId={voucher.id}
                                        label="Rest Days"
                                        field="restDays"
                                        restDays={voucher.restDays}
                                        publicHolidays={voucher.publicHolidays}
                                        readOnly={payroll.status !== "Draft"}
                                    />
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Rest Day Pay
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.restDayPay != null
                                                ? `$${voucher.restDayPay}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <VoucherEditableNumber
                                        payrollId={payroll.id}
                                        voucherId={voucher.id}
                                        label="Public Holidays"
                                        field="publicHolidays"
                                        restDays={voucher.restDays}
                                        publicHolidays={voucher.publicHolidays}
                                        readOnly={payroll.status !== "Draft"}
                                    />
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Public Holiday Pay
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.publicHolidayPay != null
                                                ? `$${voucher.publicHolidayPay}`
                                                : "–"}
                                        </p>
                                    </div>
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
                                                <TableHead>
                                                    Repayment Date
                                                </TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>
                                                    Advance Request
                                                </TableHead>
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
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Total Pay
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.totalPay != null
                                                ? `$${voucher.totalPay}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            CPF
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.cpf != null
                                                ? `$${voucher.cpf}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Advance
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.advance != null
                                                ? `$${voucher.advance}`
                                                : "–"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Net Pay
                                        </p>
                                        <p className="text-sm font-medium">
                                            {voucher.netPay != null
                                                ? `$${voucher.netPay}`
                                                : "–"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>

                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>Timesheet</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Clock in/out entries for this pay period
                        </p>
                        {missingDateIns.length > 0 ? (
                            <div className="mt-2 space-y-2">
                                <p className="text-muted-foreground text-sm">
                                    Missing dates
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {missingDateIns.map((k) => (
                                        <span
                                            key={k}
                                            className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                                            {formatDate(k)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm mt-2">
                                No missing dates in this period.
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        {entries.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No timesheet entries for this period.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Date In
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Time In
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Date Out
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Time Out
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Hours
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map((e) => {
                                        const paid = e.status === "Timesheet Paid";
                                        const status =
                                            e.status as TimesheetPaymentStatus;
                                        return (
                                            <TableRow key={e.id}>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        className={
                                                            timesheetPaymentStatusBadgeTone[
                                                                status
                                                            ]
                                                        }>
                                                        {status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatDate(e.dateIn)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatTime(
                                                        String(e.timeIn),
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatDate(e.dateOut)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatTime(
                                                        String(e.timeOut),
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {Number(e.hours).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild>
                                                        <Link
                                                            href={
                                                                paid
                                                                    ? `/dashboard/timesheet/${e.id}/view`
                                                                    : `/dashboard/timesheet/${e.id}/edit`
                                                            }>
                                                            {paid ? (
                                                                <Eye className="h-4 w-4" />
                                                            ) : (
                                                                <Pencil className="h-4 w-4" />
                                                            )}
                                                            <span className="sr-only">
                                                                {paid
                                                                    ? "View"
                                                                    : "Edit"}
                                                            </span>
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell />
                                        <TableCell
                                            colSpan={4}
                                            className="text-center font-medium">
                                            Total Working Hours
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {entries
                                                .reduce(
                                                    (sum, e) =>
                                                        sum + Number(e.hours),
                                                    0,
                                                )
                                                .toFixed(2)}
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
