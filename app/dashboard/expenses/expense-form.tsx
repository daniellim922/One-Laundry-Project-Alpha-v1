"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createExpense } from "@/app/dashboard/expenses/new/actions";
import { updateExpense } from "@/app/dashboard/expenses/[id]/edit/actions";
import {
    SGP_GST_RATE,
    buildExpenseFormSchema,
    type ExpenseFormValues,
} from "@/db/schemas/expense";
import type { SelectExpenseSupplier } from "@/db/tables/expenseSupplierTable";
import type { ExpenseCategoryWithSubcategories } from "@/services/expense/list-expense-master-data";
import type { ExpenseListRow } from "@/services/expense/list-expenses";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";

function centsToDisplay(n: number) {
    return (n / 100).toFixed(2);
}

function parseMoneyToCents(raw: string): number | null {
    const t = raw.trim();
    if (!t) return null;
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
}

function defaultSelections(
    categories: ExpenseCategoryWithSubcategories[],
    suppliers: SelectExpenseSupplier[],
    initial: ExpenseListRow | null | undefined,
): Pick<ExpenseFormValues, "categoryName" | "subcategoryName" | "supplierName"> {
    if (!initial) {
        const cat = categories[0];
        const sub = cat?.subcategories[0];
        const sup = suppliers[0];
        return {
            categoryName: cat?.name ?? "",
            subcategoryName: sub?.name ?? "",
            supplierName: sup?.name ?? "",
        };
    }

    let categoryName = initial.categoryName;
    let subcategoryName = initial.subcategoryName;

    const cat = categories.find((c) => c.name === initial.categoryName);
    if (!cat && categories.length > 0) {
        const fallback = categories[0];
        categoryName = fallback.name;
        subcategoryName = fallback.subcategories[0]?.name ?? "";
    }

    const resolvedCat = categories.find((c) => c.name === categoryName);
    const subStill =
        resolvedCat?.subcategories.some(
            (s) => s.name === initial.subcategoryName,
        ) === true;
    if (resolvedCat && !subStill) {
        subcategoryName =
            resolvedCat.subcategories[0]?.name ?? subcategoryName;
    }

    const supplierOk = suppliers.some((s) => s.name === initial.supplierName);
    const supplierName = supplierOk
        ? initial.supplierName
        : (suppliers[0]?.name ?? initial.supplierName);

    return { categoryName, subcategoryName, supplierName };
}

type ExpenseFormProps = {
    categories: ExpenseCategoryWithSubcategories[];
    suppliers: SelectExpenseSupplier[];
    mode: "create" | "edit";
    expenseId?: string;
    initial?: ExpenseListRow | null;
};

export function ExpenseForm({
    categories,
    suppliers,
    mode,
    expenseId,
    initial,
}: ExpenseFormProps) {
    const router = useRouter();

    const supplierNameList = React.useMemo(
        () => suppliers.map((s) => s.name),
        [suppliers],
    );

    const resolver = React.useMemo(
        () =>
            zodResolver(buildExpenseFormSchema(categories, supplierNameList)),
        [categories, supplierNameList],
    );

    const namesDefault = React.useMemo(
        () => defaultSelections(categories, suppliers, initial),
        [categories, suppliers, initial],
    );

    const form = useForm<ExpenseFormValues>({
        resolver,
        values: React.useMemo(
            (): ExpenseFormValues => ({
                ...namesDefault,
                description: initial?.description ?? "",
                invoiceNumber: initial?.invoiceNumber ?? "",
                supplierGstRegNumber: initial?.supplierGstRegNumber ?? "",
                subtotalCents: initial?.subtotalCents ?? 0,
                gstCents: initial?.gstCents ?? 0,
                grandTotalCents: initial?.grandTotalCents ?? 0,
                invoiceDate: initial?.invoiceDate ?? dateToLocalIsoYmd(),
                submissionDate: initial?.submissionDate ?? dateToLocalIsoYmd(),
                status: initial?.status ?? "Expense Submitted",
            }),
            [initial, namesDefault],
        ),
    });

    const [gstManual, setGstManual] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const [pending, startTransition] = React.useTransition();

    const categoryName = useWatch({
        control: form.control,
        name: "categoryName",
    });
    const subcategoryName = useWatch({
        control: form.control,
        name: "subcategoryName",
    });
    const supplierName = useWatch({
        control: form.control,
        name: "supplierName",
    });
    const subtotalCents = useWatch({
        control: form.control,
        name: "subtotalCents",
    });

    const selectedCategoryRow = categories.find((c) => c.name === categoryName);

    const categoryOptions = React.useMemo(
        () =>
            categories.map((c) => ({
                value: c.name,
                label: c.name,
            })),
        [categories],
    );

    const subcategoryOptions = React.useMemo(
        () =>
            selectedCategoryRow?.subcategories.map((s) => ({
                value: s.name,
                label: s.name,
            })) ?? [],
        [selectedCategoryRow],
    );

    const supplierOptions = React.useMemo(
        () =>
            suppliers.map((s) => ({
                value: s.name,
                label: s.name,
            })),
        [suppliers],
    );

    React.useEffect(() => {
        if (!selectedCategoryRow) return;
        const ok = selectedCategoryRow.subcategories.some(
            (s) => s.name === subcategoryName,
        );
        const firstName = selectedCategoryRow.subcategories[0]?.name;
        if (!ok && firstName) {
            form.setValue("subcategoryName", firstName, { shouldValidate: true });
        }
    }, [categoryName, form, selectedCategoryRow, subcategoryName]);

    React.useEffect(() => {
        if (gstManual) return;
        const st =
            typeof subtotalCents === "number" && Number.isFinite(subtotalCents)
                ? subtotalCents
                : 0;
        const gst = Math.round(st * SGP_GST_RATE);
        form.setValue("gstCents", gst, { shouldValidate: true });
        form.setValue("grandTotalCents", st + gst, { shouldValidate: true });
    }, [subtotalCents, gstManual, form]);

    const schema = React.useMemo(
        () => buildExpenseFormSchema(categories, supplierNameList),
        [categories, supplierNameList],
    );

    const onSubmit = (values: ExpenseFormValues) => {
        setSubmitError(null);
        startTransition(async () => {
            const parsed = schema.safeParse(values);
            if (!parsed.success) {
                setSubmitError("Please fix the highlighted fields.");
                return;
            }

            if (mode === "create") {
                const res = await createExpense(parsed.data);
                if (!res.success) {
                    setSubmitError(res.error);
                    return;
                }
                router.push(`/dashboard/expenses/${res.id}`);
                router.refresh();
                return;
            }

            if (!expenseId) {
                setSubmitError("Missing expense id");
                return;
            }

            const res = await updateExpense(expenseId, parsed.data);
            if (!res.success) {
                setSubmitError(res.error);
                return;
            }
            router.push(`/dashboard/expenses/${expenseId}`);
            router.refresh();
        });
    };

    const isPaidLocked = initial?.status === "Expense Paid";

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                        <FieldLabel>Category</FieldLabel>
                        <SelectSearch
                            options={categoryOptions}
                            value={categoryName}
                            onChange={(next) =>
                                form.setValue("categoryName", next, {
                                    shouldValidate: true,
                                })
                            }
                            disabled={
                                isPaidLocked || categories.length === 0
                            }
                            placeholder="Choose category"
                            aria-invalid={
                                !!form.formState.errors.categoryName
                            }
                        />
                        <FieldError
                            errors={[form.formState.errors.categoryName]}
                        />
                    </Field>
                    <Field>
                        <FieldLabel>Subcategory</FieldLabel>
                        <SelectSearch
                            options={subcategoryOptions}
                            value={subcategoryName ?? ""}
                            onChange={(next) =>
                                form.setValue("subcategoryName", next, {
                                    shouldValidate: true,
                                })
                            }
                            disabled={
                                isPaidLocked || subcategoryOptions.length === 0
                            }
                            placeholder="Choose subcategory"
                            aria-invalid={
                                !!form.formState.errors.subcategoryName
                            }
                        />
                        <FieldError
                            errors={[form.formState.errors.subcategoryName]}
                        />
                    </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                        <FieldLabel>Supplier</FieldLabel>
                        <SelectSearch
                            options={supplierOptions}
                            value={supplierName}
                            onChange={(next) =>
                                form.setValue("supplierName", next, {
                                    shouldValidate: true,
                                })
                            }
                            disabled={isPaidLocked || suppliers.length === 0}
                            placeholder="Choose supplier"
                            aria-invalid={
                                !!form.formState.errors.supplierName
                            }
                        />
                        <FieldError
                            errors={[form.formState.errors.supplierName]}
                        />
                    </Field>
                    <Field>
                        <FieldLabel>Description</FieldLabel>
                        <Input
                            {...form.register("description")}
                            disabled={isPaidLocked}
                        />
                        <FieldError
                            errors={[form.formState.errors.description]}
                        />
                    </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                        <FieldLabel>Invoice number</FieldLabel>
                        <Input
                            {...form.register("invoiceNumber")}
                            disabled={isPaidLocked}
                        />
                    </Field>
                    <Field>
                        <FieldLabel>Supplier GST registration</FieldLabel>
                        <Input
                            {...form.register("supplierGstRegNumber")}
                            disabled={isPaidLocked}
                        />
                    </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                        <FieldLabel>Invoice date</FieldLabel>
                        <Controller
                            control={form.control}
                            name="invoiceDate"
                            render={({ field, fieldState }) => (
                                <DatePickerInput
                                    id="invoice-date"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={isPaidLocked}
                                    aria-invalid={fieldState.invalid}
                                />
                            )}
                        />
                        <FieldError
                            errors={[form.formState.errors.invoiceDate]}
                        />
                    </Field>
                    <Field>
                        <FieldLabel>Submission date</FieldLabel>
                        <Controller
                            control={form.control}
                            name="submissionDate"
                            render={({ field, fieldState }) => (
                                <DatePickerInput
                                    id="submission-date"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={isPaidLocked}
                                    aria-invalid={fieldState.invalid}
                                />
                            )}
                        />
                        <FieldError
                            errors={[form.formState.errors.submissionDate]}
                        />
                    </Field>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Amounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field>
                                <FieldLabel>Subtotal (SGD)</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="subtotalCents"
                                    render={({ field, fieldState }) => (
                                        <InputGroup>
                                            <InputGroupAddon>$</InputGroupAddon>
                                            <InputGroupInput
                                                inputMode="decimal"
                                                value={centsToDisplay(
                                                    field.value ?? 0,
                                                )}
                                                disabled={isPaidLocked}
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                onChange={(e) => {
                                                    const cents =
                                                        parseMoneyToCents(
                                                            e.target.value,
                                                        );
                                                    field.onChange(
                                                        cents ?? 0,
                                                    );
                                                }}
                                            />
                                        </InputGroup>
                                    )}
                                />
                                <FieldError
                                    errors={[
                                        form.formState.errors.subtotalCents,
                                    ]}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>GST 9% (SGD)</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="gstCents"
                                    render={({ field, fieldState }) => (
                                        <InputGroup>
                                            <InputGroupAddon>$</InputGroupAddon>
                                            <InputGroupInput
                                                inputMode="decimal"
                                                value={centsToDisplay(
                                                    field.value ?? 0,
                                                )}
                                                disabled={
                                                    isPaidLocked || !gstManual
                                                }
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                onChange={(e) => {
                                                    const cents =
                                                        parseMoneyToCents(
                                                            e.target.value,
                                                        );
                                                    field.onChange(
                                                        cents ?? 0,
                                                    );
                                                }}
                                            />
                                        </InputGroup>
                                    )}
                                />
                                <FieldError
                                    errors={[form.formState.errors.gstCents]}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Grand total (SGD)</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="grandTotalCents"
                                    render={({ field, fieldState }) => (
                                        <InputGroup>
                                            <InputGroupAddon>$</InputGroupAddon>
                                            <InputGroupInput
                                                inputMode="decimal"
                                                value={centsToDisplay(
                                                    field.value ?? 0,
                                                )}
                                                disabled={
                                                    isPaidLocked || !gstManual
                                                }
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                onChange={(e) => {
                                                    const cents =
                                                        parseMoneyToCents(
                                                            e.target.value,
                                                        );
                                                    field.onChange(
                                                        cents ?? 0,
                                                    );
                                                }}
                                            />
                                        </InputGroup>
                                    )}
                                />
                                <FieldError
                                    errors={[
                                        form.formState.errors.grandTotalCents,
                                    ]}
                                />
                            </Field>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Checkbox
                                id="gst-manual"
                                checked={gstManual}
                                onCheckedChange={(v) =>
                                    setGstManual(v === true)
                                }
                                disabled={isPaidLocked}
                            />
                            <Label
                                htmlFor="gst-manual"
                                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Manual GST / grand total override
                            </Label>
                        </div>
                    </CardContent>
                </Card>
            </FieldGroup>

            {submitError ? (
                <p className="text-destructive text-sm">{submitError}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {!isPaidLocked ? (
                    <Button type="submit" disabled={pending}>
                        {pending
                            ? "Saving…"
                            : mode === "create"
                              ? "Create"
                              : "Save"}
                    </Button>
                ) : null}
                <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/expenses/all">Back to list</Link>
                </Button>
            </div>
        </form>
    );
}
