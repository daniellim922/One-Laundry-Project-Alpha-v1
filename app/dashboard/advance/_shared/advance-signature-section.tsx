"use client";

import { Controller, type Control } from "react-hook-form";

import type { AdvanceRequestFormValues } from "@/db/schemas/advance-request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { SignaturePad } from "@/components/ui/signature-pad";

type AdvanceSignatureSectionProps = {
    control: Control<AdvanceRequestFormValues>;
    bundledManagerSignatureDataUrl: string;
    pending: boolean;
};

export function AdvanceSignatureSection({
    control,
    bundledManagerSignatureDataUrl,
    pending,
}: AdvanceSignatureSectionProps) {
    return (
        <Card>
            <CardHeader className="border-b pb-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                    Signatures
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                    The authorised manager signature is applied automatically.
                    The employee must sign below before submitting.
                </p>
            </CardHeader>
            <CardContent className="grid gap-6 pt-4 sm:grid-cols-2">
                <Controller
                    name="managerSignature"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="min-w-0 space-y-2">
                            <FieldLabel>Manager</FieldLabel>
                            {/* eslint-disable-next-line @next/next/no-img-element -- bundled PNG data URL */}
                            <img
                                src={bundledManagerSignatureDataUrl}
                                alt=""
                                aria-hidden
                                className="max-h-36 w-full rounded-md border bg-white object-contain dark:bg-neutral-100"
                            />
                            <input type="hidden" {...field} />
                            <p className="text-muted-foreground text-xs">
                                Authorised approver signature (pre-filled).
                            </p>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="employeeSignature"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="min-w-0 space-y-2">
                            <FieldLabel>Employee</FieldLabel>
                            <SignaturePad
                                value={field.value}
                                onChange={field.onChange}
                                disabled={pending}
                                aria-label="Employee signature"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </CardContent>
        </Card>
    );
}
