import { db } from "@/lib/db";
import {
    expenseCategoryTable,
    type InsertExpenseCategory,
} from "@/db/tables/expenseCategoryTable";
import {
    expenseSubcategoryTable,
    type InsertExpenseSubcategory,
} from "@/db/tables/expenseSubcategoryTable";
import {
    expenseSupplierTable,
    type InsertExpenseSupplier,
} from "@/db/tables/expenseSupplierTable";
import { SEED_TIMESTAMP } from "./constants";

const CATEGORY_NAMES = ["Variable", "Fixed"] as const;

const SUBCATEGORIES_BY_CATEGORY: Record<
    (typeof CATEGORY_NAMES)[number],
    readonly string[]
> = {
    Variable: [
        "Utilities",
        "Fuel Expenses",
        "Chemical",
        "Dry Cleaning Services",
        "Air-Con Servicing",
        "Vehicle Maintenance",
        "Supplies",
    ],
    Fixed: ["Monthly Rental", "Interest Loan"],
};

const SUPPLIERS: readonly {
    name: string;
    gstRegNumber?: string | null;
}[] = [
    { name: "Mega Gas" },
    { name: "Shell" },
    {
        name: "Protek Chemicals And Engineering Pte Ltd",
        gstRegNumber: "M2-0074051-3",
    },
    { name: "Diversey", gstRegNumber: "199700115K" },
    { name: "Hygold Chemical Supplies", gstRegNumber: "M90357984Y" },
    { name: "Fabric Pro", gstRegNumber: "199206791R" },
    { name: "Hong Air-Con Enterprise", gstRegNumber: "53447668J" },
    { name: "Ngee Ngee Motor" },
    { name: "Astral Industries Pte Ltd", gstRegNumber: "200803694C" },
    { name: "Singapore Land Authority" },
    { name: "OCBC" },
];

export async function seedExpenseMasterData(): Promise<void> {
    const categoryInserts: InsertExpenseCategory[] = CATEGORY_NAMES.map(
        (name) => ({
            name,
            createdAt: SEED_TIMESTAMP,
            updatedAt: SEED_TIMESTAMP,
        }),
    );

    const insertedCategories = await db
        .insert(expenseCategoryTable)
        .values(categoryInserts)
        .returning({
            id: expenseCategoryTable.id,
            name: expenseCategoryTable.name,
        });

    const categoryIdByName = new Map(
        insertedCategories.map((row) => [row.name, row.id] as const),
    );

    const subcategoryInserts: InsertExpenseSubcategory[] = [];
    for (const categoryName of CATEGORY_NAMES) {
        const categoryId = categoryIdByName.get(categoryName);
        if (!categoryId) {
            throw new Error(
                `seedExpenseMasterData: missing category id for "${categoryName}"`,
            );
        }
        for (const name of SUBCATEGORIES_BY_CATEGORY[categoryName]) {
            subcategoryInserts.push({
                categoryId,
                name,
                createdAt: SEED_TIMESTAMP,
                updatedAt: SEED_TIMESTAMP,
            });
        }
    }

    await db.insert(expenseSubcategoryTable).values(subcategoryInserts);

    const supplierInserts: InsertExpenseSupplier[] = SUPPLIERS.map((s) => ({
        name: s.name,
        gstRegNumber: s.gstRegNumber ?? null,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
    }));

    await db.insert(expenseSupplierTable).values(supplierInserts);
}
