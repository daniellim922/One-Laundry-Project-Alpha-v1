import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { db } from "@/lib/db";
import { advanceTable } from "@/db/tables/payroll/advanceTable";
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

interface WorkerAdvancesProps {
    workerId: string;
    status?: "loan" | "paid";
}

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

const statusStyles: Record<string, string> = {
    loan: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export async function WorkerAdvances({ workerId, status }: WorkerAdvancesProps) {
    const advances = await db
        .select()
        .from(advanceTable)
        .where(
            status
                ? and(eq(advanceTable.workerId, workerId), eq(advanceTable.status, status))
                : eq(advanceTable.workerId, workerId),
        )
        .orderBy(advanceTable.loanDate);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle>Advance Loans</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Loan and repayment records for this worker
                    </p>
                </div>
                <Button asChild size="sm">
                    <Link href={`/dashboard/workers/${workerId}/advance`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add advance
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {advances.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No advance loans recorded.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Loan Date</TableHead>
                                <TableHead>Repayment Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {advances.map((a) => (
                                <TableRow key={a.id}>
                                    <TableCell>${a.amount}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[a.status] ?? ""}`}>
                                            {a.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(a.loanDate)}
                                    </TableCell>
                                    <TableCell>
                                        {a.repaymentDate
                                            ? formatDate(a.repaymentDate)
                                            : "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
