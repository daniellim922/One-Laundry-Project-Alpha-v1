"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { createPayrolls } from "../actions";
import { DataTable } from "@/components/data-table";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { columns, type WorkerForPayrollSelection as Worker } from "./columns";

const formSchema = z
    .object({
        periodStart: z
            .string()
            .min(1, "Period start is required")
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
        periodEnd: z
            .string()
            .min(1, "Period end is required")
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
        payrollDate: z
            .string()
            .min(1, "Payroll date is required")
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    })
    .superRefine((values, ctx) => {
        if (values.periodEnd < values.periodStart) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["periodEnd"],
                message: "Period end must be on or after period start",
            });
        }
    });

type FormValues = z.infer<typeof formSchema>;

export function PayrollForm({ workers }: { workers: Worker[] }) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [rowSelection, setRowSelection] = React.useState<
        Record<string, boolean>
    >({});

    const selectedWorkerIds = React.useMemo(() => {
        return Object.entries(rowSelection)
            .filter(([, selected]) => selected)
            .map(([id]) => id);
    }, [rowSelection]);

    const selectedCount = selectedWorkerIds.length;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            periodStart: "",
            periodEnd: "",
            payrollDate: new Date().toISOString().slice(0, 10),
        },
    });

    async function onSubmit(values: FormValues) {
        setError(null);
        setPending(true);

        const formData = new FormData();
        formData.set("periodStart", values.periodStart);
        formData.set("periodEnd", values.periodEnd);
        formData.set("payrollDate", values.payrollDate);
        selectedWorkerIds.forEach((id) => formData.append("workerId", id));

        const result = await createPayrolls(formData);
        setPending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/dashboard/payroll/all");
        router.refresh();
    }

    return (
        <Card className="mx-auto max-w-4xl">
            <CardHeader>
                <CardTitle>New payroll</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Select workers and pay period. Hours and pay are computed
                    from timesheet entries.
                </p>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                    autoComplete="off">
                    <FieldGroup>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Controller
                                name="periodStart"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="periodStart">
                                            Period start
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="periodStart"
                                            type="date"
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
                                            required
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="periodEnd"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="periodEnd">
                                            Period end
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="periodEnd"
                                            type="date"
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
                                            required
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="payrollDate"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="payrollDate">
                                        Payroll date
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="payrollDate"
                                        type="date"
                                        disabled={pending}
                                        aria-invalid={fieldState.invalid}
                                        required
                                        suppressHydrationWarning
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <div className="space-y-2 mt-8">
                        <Suspense fallback={<DataTableSkeleton />}>
                            <DataTable
                                columns={columns}
                                searchParamKey="search"
                                data={workers}
                                enableRowSelection
                                rowSelection={rowSelection}
                                onRowSelectionChange={setRowSelection}
                                getRowId={(row) => row.id}
                                pageSize={20}
                            />
                        </Suspense>
                        {selectedCount > 0 && (
                            <p className="text-muted-foreground text-sm">
                                {selectedCount} worker
                                {selectedCount !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={pending || selectedCount === 0}>
                            {pending ? "Generating..." : "Generate"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
