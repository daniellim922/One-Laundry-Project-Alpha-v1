import Link from "next/link";

import { FormPageLayout } from "@/components/form-page-layout";
import { Button } from "@/components/ui/button";

import {
    listExpenseCategoriesWithSubcategories,
    listExpenseSuppliers,
} from "@/services/expense/list-expense-master-data";

import { ExpenseCategoriesManager } from "./expense-categories-manager";

export default async function ExpenseCategoriesPage() {
    const [initialCategories, initialSuppliers] = await Promise.all([
        listExpenseCategoriesWithSubcategories(),
        listExpenseSuppliers(),
    ]);

    return (
        <FormPageLayout
            title="Expense categories"
            subtitle="Manage categories, subcategories, and suppliers used when recording expenses."
            actions={
                <Button variant="outline" asChild>
                    <Link href="/dashboard/expenses">Back to overview</Link>
                </Button>
            }
            maxWidthClassName="max-w-5xl">
            <ExpenseCategoriesManager
                initialCategories={initialCategories}
                initialSuppliers={initialSuppliers}
            />
        </FormPageLayout>
    );
}
