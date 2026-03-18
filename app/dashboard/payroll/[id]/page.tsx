import { notFound } from "next/navigation";
import { eq, and, gte, lte } from "drizzle-orm";
import Link from "next/link";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
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
import { ArrowLeft, MoreHorizontal, Pencil } from "lucide-react";

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
                                    View worker
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/workers/${worker.id}/edit`}>
                                    Edit worker
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {(
                            [
                                { key: "employmentType", label: "Employment Type" },
                                { key: "employmentArrangement", label: "Employment Arrangement" },
                                { key: "cpf", label: "CPF" },
                                { key: "monthlyPay", label: "Monthly Pay" },
                                { key: "minimumWorkingHours", label: "Minimum Working Hours" },
                                { key: "hourlyPay", label: "Hourly Pay" },
                                { key: "restDayPay", label: "Rest Day Pay" },
                                { key: "paymentMethod", label: "Payment Method" },
                                { key: "payNowPhone", label: "PayNow Phone" },
                                { key: "bankAccountNumber", label: "Bank Account Number" },
                            ] as const
                        )
                            .filter(({ key }) => employment[key] != null)
                            .map(({ key, label }) => {
                                const raw = employment[key];
                                const monetary = ["monthlyPay", "hourlyPay", "restDayPay"] as const;
                                const display = (monetary as readonly string[]).includes(key)
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
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
