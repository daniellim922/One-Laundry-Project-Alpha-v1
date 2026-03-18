import { notFound } from "next/navigation";
import { eq, and, gte, lte } from "drizzle-orm";
import Link from "next/link";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
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
import { MoreHorizontal, Pencil } from "lucide-react";
import { PayrollHeader } from "./payroll-header";
import { PaymentVoucher } from "./payment-voucher";
import { VoucherEditableNumber } from "./voucher-editable-number";

interface PageProps {
    params: Promise<{ id: string }>;
}

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function formatTime(t: string): string {
    const s = String(t);
    if (s.length >= 5) return s.slice(0, 5);
    return s;
}

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function dateKey(d: string | Date): string {
    if (d instanceof Date) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    const s = String(d);
    // If already ISO-like, keep the date portion.
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    }
    // Fallback: use original string (best-effort).
    return s;
}

function dateFromKey(key: string): Date {
    // key is expected to be YYYY-MM-DD
    return new Date(`${key}T00:00:00`);
}

export default async function PayrollDetailPage({ params }: PageProps) {
    await requirePermission("Payroll", "read");

    const { id } = await params;

    const [row] = await db
        .select({
            payroll: payrollTable,
            worker: workerTable,
            employment: employmentTable,
            voucher: payrollVoucherTable,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .innerJoin(
            payrollVoucherTable,
            eq(payrollTable.payrollVoucherId, payrollVoucherTable.id),
        )
        .where(eq(payrollTable.id, id))
        .limit(1);

    if (!row) notFound();

    const { payroll, worker, employment, voucher } = row;

    const entries = await db
        .select()
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
            ),
        )
        .orderBy(timesheetTable.dateIn);

    const presentDateIns = new Set(entries.map((e) => dateKey(e.dateIn)));
    const missingDateIns: string[] = [];
    {
        const start = dateFromKey(dateKey(payroll.periodStart));
        const end = dateFromKey(dateKey(payroll.periodEnd));
        const cursor = new Date(start);
        while (cursor <= end) {
            const key = dateKey(cursor);
            if (!presentDateIns.has(key)) missingDateIns.push(key);
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    return (
        <div className="space-y-6">
            <PayrollHeader payroll={payroll} workerName={worker.name} />

            <Card>
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
                                    href={`/dashboard/workers/${worker.id}/view`}>
                                    View
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/dashboard/workers/${worker.id}/edit`}>
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

            <Card>
                <CardHeader>
                    <CardTitle>Payroll Voucher</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Snapshot of employment terms at payroll generation
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        {/* Row 1 */}
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
                                {voucher.employmentArrangement ?? "–"}
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
                                    : voucher.paymentMethod === "Bank Transfer"
                                      ? "Bank Account"
                                      : "PayNow/Bank Account"}
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.paymentMethod === "PayNow"
                                    ? (voucher.payNowPhone ?? "–")
                                    : voucher.paymentMethod === "Bank Transfer"
                                      ? (voucher.bankAccountNumber ?? "–")
                                      : (voucher.payNowPhone ??
                                        voucher.bankAccountNumber ??
                                        "–")}
                            </p>
                        </div>

                        {/* Row 2 */}
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

                        {/* Row 3 */}
                        <div className="space-y-1 md:col-span-1 mt-10">
                            <p className="text-sm text-muted-foreground">
                                Minimum Working Hours
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.minimumWorkingHours ?? "–"}
                            </p>
                        </div>
                        <div className="space-y-1 md:col-span-3 mt-10">
                            <p className="text-sm text-muted-foreground">
                                Total Hours Worked
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.totalHoursWorked ?? "–"}
                            </p>
                        </div>

                        {/* Row 4 */}
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Hours Not Met
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.hoursNotMet ?? "–"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Hours Not Met Deduction
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.hoursNotMetDeduction != null
                                    ? voucher.hoursNotMetDeduction < 0
                                        ? `-$${Math.abs(voucher.hoursNotMetDeduction)}`
                                        : `$${voucher.hoursNotMetDeduction}`
                                    : "–"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Overtime Hours
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.overtimeHours ?? "–"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Overtime Pay
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.overtimePay != null
                                    ? `$${voucher.overtimePay}`
                                    : "–"}
                            </p>
                        </div>

                        {/* Row 5 */}
                        <VoucherEditableNumber
                            payrollId={payroll.id}
                            voucherId={voucher.id}
                            label="Rest Days"
                            field="restDays"
                            restDays={voucher.restDays}
                            publicHolidays={voucher.publicHolidays}
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

                        {/* Row 6 */}
                        <div className="space-y-1 mt-10">
                            <p className="text-sm text-muted-foreground">
                                Total Pay
                            </p>
                            <p className="text-sm font-medium">
                                {voucher.totalPay != null
                                    ? `$${voucher.totalPay}`
                                    : "–"}
                            </p>
                        </div>
                        <div className="space-y-1 mt-10">
                            <p className="text-sm text-muted-foreground">CPF</p>
                            <p className="text-sm font-medium">
                                {voucher.cpf != null ? `$${voucher.cpf}` : "–"}
                            </p>
                        </div>
                        <div className="space-y-1 md:col-span-2 mt-10">
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

            <Card>
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
                                        className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                        {formatDate(dateFromKey(k))}
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
                                    <TableHead>Date In</TableHead>
                                    <TableHead>Time In</TableHead>
                                    <TableHead>Date Out</TableHead>
                                    <TableHead>Time Out</TableHead>
                                    <TableHead className="text-right">
                                        Hours
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>
                                            {formatDate(e.dateIn)}
                                        </TableCell>
                                        <TableCell>
                                            {formatTime(String(e.timeIn))}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(e.dateOut)}
                                        </TableCell>
                                        <TableCell>
                                            {formatTime(String(e.timeOut))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(e.hours).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild>
                                                <Link
                                                    href={`/dashboard/timesheet/${e.id}/edit`}>
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        Edit
                                                    </span>
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-right font-medium">
                                        Total Working Hours
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
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

            <PaymentVoucher
                voucher={voucher}
                payroll={payroll}
                workerName={worker.name}
            />
        </div>
    );
}
