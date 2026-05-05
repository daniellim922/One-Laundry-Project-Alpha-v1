import Link from "next/link";

import { FormPageLayout } from "@/components/form-page-layout";
import { Button } from "@/components/ui/button";
import {
    listExpenseCategoriesWithSubcategories,
    listExpenseSuppliers,
} from "@/services/expense/list-expense-master-data";

import { ExpenseForm } from "../expense-form";

export default async function NewExpensePage() {
    const [categories, suppliers] = await Promise.all([
        listExpenseCategoriesWithSubcategories(),
        listExpenseSuppliers(),
    ]);
    const hasAnySub = categories.some((c) => c.subcategories.length > 0);
    const hasSuppliers = suppliers.length > 0;

    return (
        <FormPageLayout
            title="New expense"
            subtitle="Record a business expense with invoice details and GST.">
            {!hasAnySub || !hasSuppliers ? (
                <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                        {!hasAnySub
                            ? "Add at least one category and subcategory before recording an expense."
                            : "Add at least one supplier before recording an expense."}
                    </p>
                    <Button asChild>
                        <Link href="/dashboard/expenses/categories">
                            Manage categories and suppliers
                        </Link>
                    </Button>
                </div>
            ) : (
                <ExpenseForm
                    categories={categories}
                    suppliers={suppliers}
                    mode="create"
                />
            )}
        </FormPageLayout>
    );
}
