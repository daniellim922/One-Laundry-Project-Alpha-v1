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
        .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
        .innerJoin(payrollVoucherTable, eq(payrollTable.payrollVoucherId, payrollVoucherTable.id))
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

    const monetaryKeys = ["monthlyPay", "hourlyRate", "overtimePay", "restDayRate", "restDayPay", "cpf", "totalPay"] as const;

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
                                <Link href={`/dashboard/workers/${worker.id}/view`}>
                                    View
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/workers/${worker.id}/edit`}>
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
                                <p className="text-sm text-muted-foreground">Employment Type</p>
                                <p className="text-sm font-medium">{employment.employmentType}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Employment Arrangement</p>
                                <p className="text-sm font-medium">{employment.employmentArrangement}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Monthly Pay</p>
                                <p className="text-sm font-medium">
                                    {employment.monthlyPay != null ? `$${employment.monthlyPay}` : "–"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                                <p className="text-sm font-medium">
                                    {employment.hourlyRate != null ? `$${employment.hourlyRate}` : "–"}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Rest Day Rate</p>
                                <p className="text-sm font-medium">
                                    {employment.restDayRate != null ? `$${employment.restDayRate}` : "–"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Minimum Working Hours</p>
                                <p className="text-sm font-medium">
                                    {employment.minimumWorkingHours ?? "–"}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Payment Method</p>
                                <p className="text-sm font-medium">{employment.paymentMethod ?? "–"}</p>
                            </div>
                            {employment.paymentMethod === "PayNow" && employment.payNowPhone && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">PayNow Phone</p>
                                    <p className="text-sm font-medium">{employment.payNowPhone}</p>
                                </div>
                            )}
                            {employment.paymentMethod === "Bank Transfer" &&
                                employment.bankAccountNumber && (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Bank Account</p>
                                        <p className="text-sm font-medium">{employment.bankAccountNumber}</p>
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
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {(
                            [
                                { key: "employmentType", label: "Employment Type" },
                                { key: "employmentArrangement", label: "Employment Arrangement" },
                                { key: "monthlyPay", label: "Monthly Pay" },
                                { key: "hourlyRate", label: "Hourly Rate" },
                                { key: "minimumWorkingHours", label: "Minimum Working Hours" },
                                { key: "totalHoursWorked", label: "Total Hours Worked" },
                                { key: "overtimeHours", label: "Overtime Hours" },
                                { key: "overtimePay", label: "Overtime Pay" },
                                { key: "restDays", label: "Rest Days" },
                                { key: "restDayRate", label: "Rest Day Rate" },
                                { key: "restDayPay", label: "Rest Day Pay" },
                                { key: "cpf", label: "CPF" },
                                { key: "totalPay", label: "Total Pay" },
                                { key: "paymentMethod", label: "Payment Method" },
                                { key: "payNowPhone", label: "PayNow Phone" },
                                { key: "bankAccountNumber", label: "Bank Account Number" },
                            ] as const
                        )
                            .filter(({ key }) => voucher[key] != null)
                            .map(({ key, label }) => {
                                const raw = voucher[key];
                                const display = (monetaryKeys as readonly string[]).includes(key)
                                    ? `$${raw}`
                                    : String(raw);
                                return (
                                    <div key={key} className="space-y-1">
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                        <p className="text-sm font-medium">{display}</p>
                                    </div>
                                );
                            })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Timesheet</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Clock in/out entries for this pay period
                    </p>
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
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/dashboard/timesheet/${e.id}/edit`}>
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Edit</span>
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-medium">
                                        Total Working Hours
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {entries.reduce((sum, e) => sum + Number(e.hours), 0).toFixed(2)}
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
