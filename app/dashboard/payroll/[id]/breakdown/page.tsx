import Link from "next/link";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";

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
import {
    formatEnGbDmyNumeric,
    formatEnGbDmyNumericFromCalendar,
} from "@/utils/time/intl-en-gb";
import { localTimeHm } from "@/utils/time/local-time";
import { getPayrollDetailData } from "../payroll-detail-data";
import { PayrollHeader } from "../payroll-header";
import { PayrollStepProgress } from "../payroll-step-progress";
import { Badge } from "@/components/ui/badge";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import { VoucherCalculation } from "./voucher/voucher-calculation";
import { VoucherDetails } from "./voucher/voucher-details";

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
        applicablePublicHolidays,
    } = await getPayrollDetailData(id);

    const attendanceRestDays = computeRestDaysForPayrollPeriod({
        periodStart: payroll.periodStart,
        periodEnd: payroll.periodEnd,
        presentDateInKeys: entries.map((e) => e.dateIn),
    });

    const todayDmy = formatEnGbDmyNumeric(new Date());

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
                        <CardTitle>
                            Worker Employment Breakdown as of {todayDmy}
                        </CardTitle>
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
                                                PayNow
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
                        <CardTitle>Payroll Voucher Breakdown</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Snapshot of employment terms at payroll generation
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <VoucherCalculation
                            payrollId={payroll.id}
                            payrollStatus={payroll.status}
                            voucher={voucher}
                            advances={advances}
                            attendanceRestDays={attendanceRestDays}
                            applicablePublicHolidays={applicablePublicHolidays}
                        />
                        <VoucherDetails
                            payrollId={payroll.id}
                            payrollStatus={payroll.status}
                            voucher={voucher}
                        />
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
                                        const paid =
                                            e.status === "Timesheet Paid";
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
