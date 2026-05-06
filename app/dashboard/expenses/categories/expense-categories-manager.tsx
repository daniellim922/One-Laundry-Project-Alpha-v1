"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import type { SelectExpenseSupplier } from "@/db/tables/expenseSupplierTable";
import type { ExpenseCategoryWithSubcategories } from "@/services/expense/list-expense-master-data";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectSearch } from "@/components/ui/SelectSearch";

type Subcategory = ExpenseCategoryWithSubcategories["subcategories"][number];
type Category = ExpenseCategoryWithSubcategories;

export function ExpenseCategoriesManager({
    initialCategories,
    initialSuppliers,
}: {
    initialCategories: ExpenseCategoryWithSubcategories[];
    initialSuppliers: SelectExpenseSupplier[];
}) {
    const router = useRouter();
    const [categories, setCategories] =
        React.useState<Category[]>(initialCategories);
    const [suppliers, setSuppliers] =
        React.useState<SelectExpenseSupplier[]>(initialSuppliers);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);

    const refresh = React.useCallback(async () => {
        setLoadError(null);
        const [catsRes, supRes] = await Promise.all([
            fetch("/api/expenses/categories", { credentials: "include" }),
            fetch("/api/expenses/suppliers", { credentials: "include" }),
        ]);
        const catsJson = (await catsRes.json()) as {
            ok?: boolean;
            data?: Category[];
        };
        const supJson = (await supRes.json()) as {
            ok?: boolean;
            data?: SelectExpenseSupplier[];
        };
        if (!catsRes.ok || !catsJson.ok || !catsJson.data) {
            setLoadError("Could not load categories.");
            return;
        }
        if (!supRes.ok || !supJson.ok || !supJson.data) {
            setLoadError("Could not load suppliers.");
            return;
        }
        setCategories(catsJson.data);
        setSuppliers(supJson.data);
    }, []);

    return (
        <div className="space-y-8">
            {loadError ? (
                <p className="text-destructive text-sm">{loadError}</p>
            ) : null}

            <CategoryCardSection
                categories={categories}
                busy={busy}
                setBusy={setBusy}
                onRefresh={refresh}
                onRouterRefresh={() => router.refresh()}
            />

            <SubcategoryCardSection
                categories={categories}
                busy={busy}
                setBusy={setBusy}
                onRefresh={refresh}
                onRouterRefresh={() => router.refresh()}
            />

            <SupplierCardSection
                suppliers={suppliers}
                busy={busy}
                setBusy={setBusy}
                onRefresh={refresh}
                onRouterRefresh={() => router.refresh()}
            />
        </div>
    );
}

function CategoryCardSection({
    categories,
    busy,
    setBusy,
    onRefresh,
    onRouterRefresh,
}: {
    categories: Category[];
    busy: boolean;
    setBusy: (v: boolean) => void;
    onRefresh: () => Promise<void>;
    onRouterRefresh: () => void;
}) {
    const [name, setName] = React.useState("");
    const [deleteTarget, setDeleteTarget] = React.useState<Category | null>(
        null,
    );

    async function addCategory(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            const res = await fetch("/api/expenses/categories", {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            if (res.ok) {
                setName("");
                await onRefresh();
                onRouterRefresh();
            }
        } finally {
            setBusy(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setBusy(true);
        try {
            const res = await fetch(
                `/api/expenses/categories/${deleteTarget.id}`,
                { method: "DELETE", credentials: "include" },
            );
            if (res.ok) {
                setDeleteTarget(null);
                await onRefresh();
                onRouterRefresh();
            }
        } finally {
            setBusy(false);
        }
    }

    const subLabels =
        deleteTarget?.subcategories.map((s) => s.name).filter(Boolean) ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form
                    onSubmit={(e) => void addCategory(e)}
                    className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Field className="min-w-[200px] flex-1">
                        <FieldLabel>Name</FieldLabel>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Operating overheads"
                        />
                    </Field>
                    <Button type="submit" disabled={busy}>
                        Add
                    </Button>
                </form>
                <ul className="space-y-2">
                    {categories.map((c) => (
                        <li
                            key={`${c.id}-${+c.updatedAt}`}
                            className="flex items-center justify-between gap-3 border-b py-2">
                            <span className="text-sm">{c.name}</span>
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 shrink-0"
                                aria-label={`Delete category ${c.name}`}
                                disabled={busy}
                                onClick={() => setDeleteTarget(c)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete category{deleteTarget ? ` "${deleteTarget.name}"` : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm">
                                <div className="text-muted-foreground space-y-2">
                                    {subLabels.length > 0 ? (
                                        <>
                                            <span>
                                                The following subcategories will
                                                also be deleted:
                                            </span>
                                            <ul className="list-inside list-disc">
                                                {subLabels.map((n) => (
                                                    <li key={n}>{n}</li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : (
                                        <span>
                                            This category has no subcategories.
                                        </span>
                                    )}
                                </div>
                                <Alert variant="destructive">
                                    <AlertTriangle />
                                    <AlertDescription className="font-medium">
                                        This action cannot be undone.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void confirmDelete()}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

function SubcategoryCardSection({
    categories,
    busy,
    setBusy,
    onRefresh,
    onRouterRefresh,
}: {
    categories: Category[];
    busy: boolean;
    setBusy: (v: boolean) => void;
    onRefresh: () => Promise<void>;
    onRouterRefresh: () => void;
}) {
    const [categoryId, setCategoryId] = React.useState(
        categories[0]?.id ?? "",
    );
    const [name, setName] = React.useState("");
    const [deleteTarget, setDeleteTarget] = React.useState<Subcategory | null>(
        null,
    );

    const categoryOptions = React.useMemo(
        () =>
            categories.map((c) => ({
                value: c.id,
                label: c.name,
            })),
        [categories],
    );

    const flatSubs = React.useMemo(
        () =>
            categories.flatMap((c) =>
                c.subcategories.map((s) => ({
                    sub: s,
                    categoryId: c.id,
                    categoryLabel: c.name,
                })),
            ),
        [categories],
    );

    React.useEffect(() => {
        if (
            categoryId &&
            !categories.some((c) => c.id === categoryId) &&
            categories[0]
        ) {
            setCategoryId(categories[0].id);
        }
    }, [categories, categoryId]);

    async function addSubcategory(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !categoryId) return;
        setBusy(true);
        try {
            const res = await fetch("/api/expenses/subcategories", {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    categoryId,
                    name: name.trim(),
                }),
            });
            if (res.ok) {
                setName("");
                await onRefresh();
                onRouterRefresh();
            }
        } finally {
            setBusy(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setBusy(true);
        try {
            const res = await fetch(
                `/api/expenses/subcategories/${deleteTarget.id}`,
                { method: "DELETE", credentials: "include" },
            );
            if (res.ok) {
                setDeleteTarget(null);
                await onRefresh();
                onRouterRefresh();
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Sub Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form
                    onSubmit={(e) => void addSubcategory(e)}
                    className="flex flex-col gap-3 md:flex-row md:items-end">
                    <Field className="min-w-[200px] flex-1">
                        <FieldLabel>Category</FieldLabel>
                        <SelectSearch
                            options={categoryOptions}
                            value={categoryId}
                            onChange={setCategoryId}
                            disabled={
                                busy ||
                                categories.length === 0
                            }
                            placeholder="Choose category"
                        />
                    </Field>
                    <Field className="min-w-[200px] flex-1">
                        <FieldLabel>Name</FieldLabel>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Petrol"
                        />
                    </Field>
                    <Button
                        type="submit"
                        disabled={busy || !categoryId}>
                        Add
                    </Button>
                </form>
                <ul className="space-y-2">
                    {flatSubs.map(({ sub, categoryLabel }) => (
                        <li
                            key={`${sub.id}-${+sub.updatedAt}`}
                            className="flex items-center justify-between gap-3 border-b py-2">
                            <span className="text-sm">
                                {categoryLabel} - {sub.name}
                            </span>
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 shrink-0"
                                aria-label={`Delete subcategory ${sub.name}`}
                                disabled={busy}
                                onClick={() => setDeleteTarget(sub)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete subcategory
                            {deleteTarget ? ` "${deleteTarget.name}"` : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <Alert variant="destructive">
                                <AlertTriangle />
                                <AlertDescription className="font-medium">
                                    This action cannot be undone.
                                </AlertDescription>
                            </Alert>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void confirmDelete()}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

function SupplierCardSection({
    suppliers,
    busy,
    setBusy,
    onRefresh,
    onRouterRefresh,
}: {
    suppliers: SelectExpenseSupplier[];
    busy: boolean;
    setBusy: (v: boolean) => void;
    onRefresh: () => Promise<void>;
    onRouterRefresh: () => void;
}) {
    const [name, setName] = React.useState("");
    const [gstRegNumber, setGstRegNumber] = React.useState("");
    const [deleteTarget, setDeleteTarget] =
        React.useState<SelectExpenseSupplier | null>(null);

    async function addSupplier(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            const gstTrimmed = gstRegNumber.trim();
            const res = await fetch("/api/expenses/suppliers", {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    ...(gstTrimmed !== ""
                        ? { gstRegNumber: gstTrimmed }
                        : {}),
                }),
            });
            if (res.ok) {
                setName("");
                setGstRegNumber("");
                await onRefresh();
                onRouterRefresh();
            }
        } finally {
            setBusy(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setBusy(true);
        try {
            const res = await fetch(
                `/api/expenses/suppliers/${deleteTarget.id}`,
                { method: "DELETE", credentials: "include" },
            );
            if (res.ok) {
                setDeleteTarget(null);
                await onRefresh();
                onRouterRefresh();
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form
                    onSubmit={(e) => void addSupplier(e)}
                    className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    <Field className="min-w-[200px] flex-1">
                        <FieldLabel>Name</FieldLabel>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Supplies Pte Ltd"
                        />
                    </Field>
                    <Field className="min-w-[180px] flex-1">
                        <FieldLabel>GST registration number (optional)</FieldLabel>
                        <Input
                            value={gstRegNumber}
                            onChange={(e) => setGstRegNumber(e.target.value)}
                            placeholder="e.g. M90371234X"
                            autoComplete="off"
                        />
                    </Field>
                    <Button type="submit" disabled={busy}>
                        Add
                    </Button>
                </form>
                <ul className="space-y-2">
                    {suppliers.map((s) => (
                        <li
                            key={`${s.id}-${+s.updatedAt}`}
                            className="flex items-center justify-between gap-3 border-b py-2">
                            <p className="text-sm">
                                {s.gstRegNumber
                                    ? `${s.name} - GST ${s.gstRegNumber}`
                                    : s.name}
                            </p>
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 shrink-0"
                                aria-label={`Delete supplier ${s.name}`}
                                disabled={busy}
                                onClick={() => setDeleteTarget(s)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete supplier{deleteTarget ? ` "${deleteTarget.name}"` : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <Alert variant="destructive">
                                <AlertTriangle />
                                <AlertDescription className="font-medium">
                                    This action cannot be undone.
                                </AlertDescription>
                            </Alert>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void confirmDelete()}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
