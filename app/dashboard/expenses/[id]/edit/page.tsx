import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPageLayout } from "@/components/form-page-layout";
import { Button } from "@/components/ui/button";
import { getExpenseDetailById } from "@/services/expense/list-expenses";
import {
    listExpenseCategoriesWithSubcategories,
    listExpenseSuppliers,
} from "@/services/expense/list-expense-master-data";

import { ExpenseForm } from "../../expense-form";

export default async function EditExpensePage({
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
                createdAt: now,
                updatedAt: now,
            },
            ...suppliers,
        ];
    }

    const hasAnySub = categories.some((c) => c.subcategories.length > 0);

    return (
        <FormPageLayout
            title="Edit expense"
            subtitle="Update expense details. Paid expenses cannot be edited."
            actions={
                <Button variant="outline" asChild>
                    <Link href={`/dashboard/expenses/${id}/view`}>
                        View detail
                    </Link>
                </Button>
            }>
            {!hasAnySub ? (
                <p className="text-muted-foreground text-sm">
                    No categories configured.
                </p>
            ) : (
                <ExpenseForm
                    categories={categories}
                    suppliers={suppliers}
                    mode="edit"
                    expenseId={id}
                    initial={expense}
                />
            )}
        </FormPageLayout>
    );
}
