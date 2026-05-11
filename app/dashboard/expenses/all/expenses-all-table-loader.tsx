import { listExpensesWithCategories } from "@/services/expense/list-expenses";

import { ExpensesAllTable } from "./expenses-all-table";

export async function ExpensesAllTableLoader() {
    const expenses = await listExpensesWithCategories();

    return <ExpensesAllTable expenses={expenses} />;
}
