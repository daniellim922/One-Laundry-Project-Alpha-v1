import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPageLayout } from "@/components/form-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { expenseStatusBadgeTone } from "@/types/badge-tones";
import { getExpenseDetailById } from "@/services/expense/list-expenses";
import { formatEnGbDmyNumericFromIso } from "@/utils/time/intl-en-gb";

import { ExpenseDetailMarkPaid } from "./expense-detail-mark-paid";

export default async function ExpenseDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const expense = await getExpenseDetailById(id);

    if (!expense) {
        notFound();
    }

    const isPaid = expense.status === "Expense Paid";

    return (
        <FormPageLayout
            title={expense.supplierName}
            subtitle={
                <span className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                        {formatEnGbDmyNumericFromIso(expense.invoiceDate)} ·{" "}
                        {expense.categoryName} — {expense.subcategoryName}
                    </span>
                    <Badge
                        variant="outline"
                        className={expenseStatusBadgeTone[expense.status]}>
                        {expense.status}
                    </Badge>
                </span>
            }
            actions={
                <div className="flex flex-wrap gap-2">
                    {!isPaid ? (
                        <>
                            <ExpenseDetailMarkPaid expenseId={expense.id} />
                            <Button asChild>
                                <Link href={`/dashboard/expenses/${id}/edit`}>
                                    Edit
                                </Link>
                            </Button>
                        </>
                    ) : null}
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/expenses/all">All expenses</Link>
                    </Button>
                </div>
            }>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Invoice</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-1 text-sm">
                        <p>
                            <span className="text-foreground font-medium">
                                Invoice no.
                            </span>{" "}
                            {expense.invoiceNumber ?? "—"}
                        </p>
                        <p>
                            <span className="text-foreground font-medium">
                                Supplier GST
                            </span>{" "}
                            {expense.supplierGstRegNumber ?? "—"}
                        </p>
                        <p>
                            <span className="text-foreground font-medium">
                                Submission date
                            </span>{" "}
                            {formatEnGbDmyNumericFromIso(expense.submissionDate)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Amounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <p>
                            Subtotal:{" "}
                            <span className="font-medium">
                                $
                                {(expense.subtotalCents / 100).toLocaleString(
                                    "en-SG",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </span>
                        </p>
                        <p>
                            GST 9%:{" "}
                            <span className="font-medium">
                                $
                                {(expense.gstCents / 100).toLocaleString(
                                    "en-SG",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </span>
                        </p>
                        <p>
                            Grand total:{" "}
                            <span className="font-semibold">
                                $
                                {(
                                    expense.grandTotalCents / 100
                                ).toLocaleString("en-SG", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </p>
                    </CardContent>
                </Card>
            </div>
            {expense.description ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm whitespace-pre-wrap">
                        {expense.description}
                    </CardContent>
                </Card>
            ) : null}
        </FormPageLayout>
    );
}
