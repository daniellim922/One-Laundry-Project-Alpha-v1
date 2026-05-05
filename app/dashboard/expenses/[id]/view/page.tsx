import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { FormPageLayout } from "@/components/form-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { expenseStatusBadgeTone } from "@/types/badge-tones";
import { getExpenseDetailById } from "@/services/expense/list-expenses";
import {
    listExpenseCategoriesWithSubcategories,
    listExpenseSuppliers,
} from "@/services/expense/list-expense-master-data";
import { formatEnGbDmyNumericFromIso } from "@/utils/time/intl-en-gb";

import { ExpenseDetailMarkPaid } from "../expense-detail-mark-paid";
import { ExpenseDetailRevertSubmitted } from "../expense-detail-revert-submitted";
import { ExpenseForm } from "../../expense-form";

export default async function ExpenseViewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [categories, suppliersFromDb, expense] = await Promise.all([
        listExpenseCategoriesWithSubcategories(),
        listExpenseSuppliers(),
        getExpenseDetailById(id),
    ]);

    if (!expense) {
        notFound();
    }

    let suppliers = suppliersFromDb;
    if (
        !suppliers.some((s) => s.name === expense.supplierName) &&
        expense.supplierName.trim() !== ""
    ) {
        const now = new Date();
        suppliers = [
            {
                id: crypto.randomUUID(),
                name: expense.supplierName,
                gstRegNumber: expense.supplierGstRegNumber ?? null,
                createdAt: now,
                updatedAt: now,
            },
            ...suppliers,
        ];
    }

    const isPaid = expense.status === "Expense Paid";
    const hasAnySub = categories.some((c) => c.subcategories.length > 0);

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
                            <Button variant="outline" asChild>
                                <Link
                                    className="inline-flex items-center gap-2"
                                    href={`/dashboard/expenses/${id}/edit`}>
                                    <Pencil className="h-4 w-4" aria-hidden />
                                    Edit
                                </Link>
                            </Button>
                        </>
                    ) : (
                        <ExpenseDetailRevertSubmitted
                            expenseId={expense.id}
                        />
                    )}
                </div>
            }>
            {!hasAnySub ? (
                <p className="text-muted-foreground text-sm">
                    No categories configured.
                </p>
            ) : (
                <ExpenseForm
                    categories={categories}
                    suppliers={suppliers}
                    mode="view"
                    initial={expense}
                />
            )}
        </FormPageLayout>
    );
}
