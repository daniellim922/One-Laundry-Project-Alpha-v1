"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Banknote, Calendar, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { createAdvance } from "./actions";

const advanceFormSchema = z
    .object({
        amount: z
            .string()
            .min(1, "Amount is required")
            .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
                message: "Amount must be a positive integer",
            }),
        status: z.enum(["loan", "paid"]),
        loanDate: z
            .string()
            .min(1, "Loan date is required")
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
        repaymentDate: z
            .string()
            .transform((v) => v.trim())
            .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
    })
    .superRefine((values, ctx) => {
        if (values.repaymentDate && values.repaymentDate < values.loanDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["repaymentDate"],
                message: "Repayment date must be on or after loan date",
            });
        }
    });

type AdvanceFormValues = z.infer<typeof advanceFormSchema>;

function todayIsoDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

interface AdvanceFormProps {
    workerId: string;
    workerName: string;
}

export function AdvanceForm({ workerId, workerName }: AdvanceFormProps) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const form = useForm<AdvanceFormValues>({
        resolver: zodResolver(advanceFormSchema),
        defaultValues: {
            amount: "",
            status: "loan",
            loanDate: todayIsoDate(),
            repaymentDate: "",
        },
    });

    const onSubmit = async (data: AdvanceFormValues) => {
        setError(null);
        setPending(true);

        const formData = new FormData();
        formData.set("amount", data.amount);
        formData.set("status", data.status);
        formData.set("loanDate", data.loanDate);
        formData.set("repaymentDate", data.repaymentDate);

        const result = await createAdvance(workerId, formData);
        setPending(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        router.push(`/dashboard/workers/${workerId}/view`);
        router.refresh();
    };

    const formId = "advance-form";

    return (
        <Card>
            <CardHeader>
                <CardDescription>
                    Record an advance for <span className="font-medium">{workerName}</span>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id={formId}
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                    autoComplete="off">
                    <FieldGroup className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="amount"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-amount`}>
                                            Amount
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-amount`}
                                                type="number"
                                                step={1}
                                                min={1}
                                                inputMode="numeric"
                                                aria-invalid={fieldState.invalid}
                                                disabled={pending}
                                            />
                                            <InputGroupAddon>
                                                <Banknote className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="status"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-status`}>
                                            Status
                                        </FieldLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(v) =>
                                                field.onChange(v as AdvanceFormValues["status"])
                                            }
                                            disabled={pending}>
                                            <SelectTrigger
                                                id={`${formId}-status`}
                                                aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="loan">Loan</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="loanDate"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-loanDate`}>
                                            Loan date
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-loanDate`}
                                                type="date"
                                                aria-invalid={fieldState.invalid}
                                                disabled={pending}
                                            />
                                            <InputGroupAddon>
                                                <Calendar className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="repaymentDate"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="space-y-2">
                                        <FieldLabel htmlFor={`${formId}-repaymentDate`}>
                                            Repayment date
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={`${formId}-repaymentDate`}
                                                type="date"
                                                aria-invalid={fieldState.invalid}
                                                disabled={pending}
                                            />
                                            <InputGroupAddon>
                                                <Calendar className="size-4 text-muted-foreground" />
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>
                    </FieldGroup>

                    <div className="flex flex-col gap-2 pt-2">
                        {error && (
                            <p className="text-destructive text-sm">{error}</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button type="submit" disabled={pending}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {pending ? "Saving..." : "Create advance"}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

