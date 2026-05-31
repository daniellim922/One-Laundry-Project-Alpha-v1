"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    workerUpsertSchema,
    type WorkerUpsertFormInput,
    type WorkerUpsertValues,
} from "@/db/schemas/worker-employment";
import type { WorkerWithEmployment } from "@/db/tables/workerTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import { createWorker, updateWorker } from "./actions";
import { EmploymentTermsFields } from "./_shared/employment-terms-fields";
import { PaymentMethodFields } from "./_shared/payment-method-fields";
import { WorkerIdentityFields } from "./_shared/worker-identity-fields";

function optionalNumberString(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return "";
    return String(n);
}

type WorkerFormValues = WorkerUpsertFormInput;

function getDefaultValues(
    worker?: WorkerWithEmployment | null,
): WorkerFormValues {
    return {
        name: worker?.name ?? "",
        email: worker?.email ?? "",
        phone: worker?.phone ?? "",
        status: (worker?.status ?? "Active") as WorkerFormValues["status"],
        employmentType: (worker?.employmentType ??
            "Full Time") as WorkerFormValues["employmentType"],
        employmentArrangement: (worker?.employmentArrangement ??
            "Local Worker") as WorkerFormValues["employmentArrangement"],
        shiftPattern: (worker?.shiftPattern ??
            "Day Shift") as WorkerFormValues["shiftPattern"],
        countryOfOrigin: worker?.countryOfOrigin ?? "",
        race: worker?.race ?? "",
        cpf: optionalNumberString(worker?.cpf ?? undefined),
        monthlyPay: optionalNumberString(worker?.monthlyPay ?? undefined),
        hourlyRate: optionalNumberString(worker?.hourlyRate ?? undefined),
        restDayRate: optionalNumberString(worker?.restDayRate ?? undefined),
        minimumWorkingHours: optionalNumberString(
            worker?.minimumWorkingHours ?? undefined,
        ),
        paymentMethod: (worker?.paymentMethod ??
            "Cash") as WorkerFormValues["paymentMethod"],
        payNowPhone: worker?.payNowPhone ?? "",
        bankAccountNumber: worker?.bankAccountNumber ?? "",
    };
}

interface WorkerFormProps {
    worker?: WorkerWithEmployment | null;
    /** When true, all fields are read-only (view mode) */
    disabled?: boolean;
}

export function WorkerForm({ worker, disabled = false }: WorkerFormProps) {
    const isCreate = !worker;

    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const form = useForm<WorkerFormValues, undefined, WorkerUpsertValues>({
        resolver: zodResolver(workerUpsertSchema),
        defaultValues: getDefaultValues(worker),
        mode: "onTouched",
    });

    const watchedValues = useWatch({ control: form.control });
    const isFormValid =
        watchedValues === undefined
            ? false
            : workerUpsertSchema.safeParse(watchedValues).success;

    const onSubmit = async (data: WorkerUpsertValues) => {
        if (disabled) return;

        setError(null);
        setPending(true);

        let result;
        if (!worker) {
            result = await createWorker(data);
        } else {
            result = await updateWorker(worker.id, data);
        }

        setPending(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        router.push("/dashboard/worker/all");
        router.refresh();
    };

    const formId = "worker-form";

    const employmentType = form.watch("employmentType");
    const employmentArrangement = form.watch("employmentArrangement");
    const paymentMethod = form.watch("paymentMethod");

    const isFullTime = employmentType === "Full Time";
    const isLocalWorker = employmentArrangement === "Local Worker";

    return (
        <Card>
            <CardHeader>
                {!isCreate && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <CardDescription className="space-y-1 text-sm">
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>ID: {worker.id}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>
                                    Created:{" "}
                                    {formatEnGbDmyNumericFromCalendar(
                                        worker.createdAt,
                                    )}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>
                                    Updated:{" "}
                                    {formatEnGbDmyNumericFromCalendar(
                                        worker.updatedAt,
                                    )}
                                </span>
                            </div>
                        </CardDescription>

                        <Controller
                            name="status"
                            control={form.control}
                            render={({ field }) => (
                                <div className="w-full sm:w-auto">
                                    <div
                                        role="group"
                                        aria-label="Status"
                                        className="flex gap-2 sm:justify-end">
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            aria-pressed={
                                                field.value === "Active"
                                            }
                                            onClick={() =>
                                                field.onChange("Active")
                                            }
                                            className={cn(
                                                "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors sm:flex-none",
                                                field.value === "Active"
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50"
                                                    : "border-input bg-muted/50 text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10",
                                                disabled &&
                                                    "cursor-not-allowed opacity-50",
                                            )}>
                                            Active
                                        </button>
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            aria-pressed={
                                                field.value === "Inactive"
                                            }
                                            onClick={() =>
                                                field.onChange("Inactive")
                                            }
                                            className={cn(
                                                "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors sm:flex-none",
                                                field.value === "Inactive"
                                                    ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/50"
                                                    : "border-input bg-muted/50 text-muted-foreground hover:border-red-300 hover:bg-red-50/50 dark:hover:border-red-500/30 dark:hover:bg-red-500/10",
                                                disabled &&
                                                    "cursor-not-allowed opacity-50",
                                            )}>
                                            Inactive
                                        </button>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <form
                    id={formId}
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                    autoComplete="off">
                    <FieldGroup className="space-y-6">
                        <WorkerIdentityFields
                            control={form.control}
                            formId={formId}
                            disabled={disabled}
                        />
                        <EmploymentTermsFields
                            control={form.control}
                            formId={formId}
                            disabled={disabled}
                            isFullTime={isFullTime}
                            isLocalWorker={isLocalWorker}
                        />
                        <PaymentMethodFields
                            control={form.control}
                            form={form}
                            formId={formId}
                            disabled={disabled}
                            paymentMethod={paymentMethod}
                        />
                    </FieldGroup>

                    {!disabled && (
                        <div className="flex flex-col gap-2 pt-2">
                            {error && (
                                <p className="text-destructive text-sm">
                                    {error}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="submit"
                                    disabled={pending || !isFormValid}>
                                    {pending
                                        ? isCreate
                                            ? "Adding..."
                                            : "Saving..."
                                        : isCreate
                                          ? "Add New Worker"
                                          : "Save changes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
