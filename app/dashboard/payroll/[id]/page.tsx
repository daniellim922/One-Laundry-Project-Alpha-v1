import { notFound } from "next/navigation";
import { eq, and, gte, lte } from "drizzle-orm";
import Link from "next/link";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { STANDARD_HOURS_PER_MONTH } from "@/lib/payroll-utils";
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
import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-CA", {
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
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
        .where(eq(payrollTable.id, id))
        .limit(1);

    if (!row) notFound();

    const { payroll, worker, employment } = row;

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

    const dailyHours = entries.map((e) => Number(e.hours));
    const totalHours = dailyHours.reduce((sum, h) => sum + h, 0);

    let overtimeHours = 0;
    for (const h of dailyHours) {
        if (h > 8) overtimeHours += h - 8;
    }

    const expectedMonthlyHours =
        employment.employmentType === "Full Time"
            ? STANDARD_HOURS_PER_MONTH
            : Math.round(STANDARD_HOURS_PER_MONTH / 2);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/payroll">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        {worker.name}
                        <span
                            className={`inline-flex rounded-full px-2 py-1 text-sm font-medium ${
                                payroll.status === "paid"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                    : payroll.status === "approved"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                      : "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300"
                            }`}>
                            {payroll.status}
                        </span>
                    </h1>
                    <p className="text-muted-foreground">
                        Period: {formatDate(payroll.periodStart)} –{" "}
                        {formatDate(payroll.periodEnd)} | Payroll date:{" "}
                        {formatDate(payroll.payrollDate)}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pay breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Monthly pay
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {employment.monthlyPay != null
                                        ? `$${employment.monthlyPay}`
                                        : "—"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Hourly pay rate
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {employment.hourlyPay != null
                                        ? `$${employment.hourlyPay}/hr`
                                        : employment.monthlyPay != null
                                          ? `$${(
                                                employment.monthlyPay /
                                                STANDARD_HOURS_PER_MONTH
                                            ).toFixed(2)}/hr`
                                          : "—"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Minimum working hours
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {employment.workingHours != null
                                        ? `${employment.workingHours}`
                                        : "—"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Rest day pay
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {employment.monthlyPay != null
                                        ? `$${Math.round(
                                              employment.monthlyPay / 26,
                                          )}`
                                        : "—"}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
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
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time in</TableHead>
                                    <TableHead>Time out</TableHead>
                                    <TableHead className="text-right">
                                        Hours
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
                                            {formatTime(String(e.timeOut))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(e.hours).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="text-muted-foreground">
                                        Total hours
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {totalHours.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="text-muted-foreground">
                                        Expected ({employment.employmentType})
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {expectedMonthlyHours}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="text-muted-foreground">
                                        Overtime
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {overtimeHours.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
