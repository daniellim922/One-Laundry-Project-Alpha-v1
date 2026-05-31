"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createAdvanceRequest } from "@/app/dashboard/advance/new/actions";
import { updateAdvanceRequest } from "@/app/dashboard/advance/[id]/edit/actions";
import {
    advanceRequestFormSchema,
    type AdvanceRequestFormValues,
} from "@/db/schemas/advance-request";
import type { AdvanceRequestDetail } from "@/utils/advance/queries";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AdvanceInformationFields } from "@/app/dashboard/advance/_shared/advance-information-fields";
import { AdvanceInstallmentFields } from "@/app/dashboard/advance/_shared/advance-installment-fields";
import {
    createAdvanceRequestDefaultValues,
    detailToDefaultValues,
    toSaveAdvanceRequestInput,
    type AdvanceRequestWorkerOption,
} from "@/app/dashboard/advance/_shared/advance-request-form-defaults";
import { AdvanceRequestReadOnlyBody } from "@/app/dashboard/advance/_shared/advance-request-read-only";
import { AdvanceSignatureSection } from "@/app/dashboard/advance/_shared/advance-signature-section";
import { generateAdvancePdfAfterCreate } from "@/app/dashboard/advance/_shared/advance-voucher-actions";

export type { AdvanceRequestWorkerOption };

type AdvanceRequestFormEditableProps = {
    workers: AdvanceRequestWorkerOption[];
    bundledManagerSignatureDataUrl: string;
    initialWorkerId?: string;
    initialData?: AdvanceRequestDetail;
    advanceRequestId?: string;
};

function AdvanceRequestFormEditable({
    workers,
    bundledManagerSignatureDataUrl,
    initialWorkerId,
    initialData,
    advanceRequestId,
}: AdvanceRequestFormEditableProps) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [generatingPdf, setGeneratingPdf] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const isEditMode = Boolean(initialData && advanceRequestId);

    const form = useForm<AdvanceRequestFormValues>({
        resolver: zodResolver(advanceRequestFormSchema),
        mode: "onChange",
        defaultValues: initialData
            ? detailToDefaultValues(initialData, bundledManagerSignatureDataUrl)
            : createAdvanceRequestDefaultValues(
                  bundledManagerSignatureDataUrl,
                  initialWorkerId,
              ),
    });

    const { fields, insert, remove } = useFieldArray({
        control: form.control,
        name: "installmentAmounts",
    });

    const formId = "advance-request-form";
    const installmentAmountsError =
        form.formState.errors.installmentAmounts?.message;

    async function onSubmit(data: AdvanceRequestFormValues) {
        setError(null);
        setPending(true);

        let payload;
        try {
            payload = toSaveAdvanceRequestInput(data);
        } catch (e) {
            setPending(false);
            setError(
                e instanceof Error ? e.message : "Invalid advance request data",
            );
            return;
        }

        if (isEditMode && advanceRequestId) {
            const result = await updateAdvanceRequest(
                advanceRequestId,
                payload,
            );
            setPending(false);

            if (!result.success) {
                setError(result.error);
                return;
            }

            router.push(`/dashboard/advance/${advanceRequestId}`);
            router.refresh();
            return;
        }

        const result = await createAdvanceRequest(payload);
        setPending(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        setGeneratingPdf(true);
        try {
            await generateAdvancePdfAfterCreate(result.id);
        } finally {
            setGeneratingPdf(false);
        }

        router.push("/dashboard/advance/all");
        router.refresh();
    }

    const scrollToFirstError = () => {
        const firstError = document.querySelector(
            '[data-slot="field-error"], [role="alert"]',
        );
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <form
            id={formId}
            data-testid="advance-request-form"
            onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}
            className="space-y-6"
            autoComplete="off">
            {error ? (
                <p className="text-destructive text-sm" role="alert">
                    {error}
                </p>
            ) : null}

            <FieldGroup className="gap-6">
                <AdvanceInformationFields
                    control={form.control}
                    formId={formId}
                    workers={workers}
                    pending={pending}
                />

                <AdvanceInstallmentFields
                    control={form.control}
                    formId={formId}
                    pending={pending}
                    showInstallmentStatusColumn={isEditMode}
                    fields={fields}
                    insert={insert}
                    remove={remove}
                    getValues={form.getValues}
                    watch={form.watch}
                    installmentAmountsError={installmentAmountsError}
                />

                <AdvanceSignatureSection
                    control={form.control}
                    bundledManagerSignatureDataUrl={
                        bundledManagerSignatureDataUrl
                    }
                    pending={pending}
                />
            </FieldGroup>

            <div className="flex flex-col items-end gap-3">
                {(error || installmentAmountsError) && (
                    <p className="text-destructive text-sm w-full" role="alert">
                        {error ?? installmentAmountsError}
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={pending || generatingPdf || workers.length === 0}
                    data-testid="advance-request-submit">
                    {generatingPdf
                        ? "Generating PDF…"
                        : pending
                          ? isEditMode
                              ? "Saving…"
                              : "Submitting…"
                          : isEditMode
                            ? "Save changes"
                            : "Submit request"}
                </Button>
            </div>
        </form>
    );
}

export function AdvanceRequestForm({
    workers = [],
    bundledManagerSignatureDataUrl,
    initialWorkerId,
    initialData,
    advanceRequestId,
    readOnly = false,
}: {
    workers?: AdvanceRequestWorkerOption[];
    bundledManagerSignatureDataUrl?: string;
    initialWorkerId?: string;
    initialData?: AdvanceRequestDetail;
    advanceRequestId?: string;
    readOnly?: boolean;
}) {
    if (readOnly && initialData) {
        return (
            <div data-testid="advance-detail">
                <div data-testid="advance-request-form">
                    <AdvanceRequestReadOnlyBody detail={initialData} />
                </div>
            </div>
        );
    }

    return (
        <AdvanceRequestFormEditable
            workers={workers}
            bundledManagerSignatureDataUrl={
                bundledManagerSignatureDataUrl ?? ""
            }
            initialWorkerId={initialWorkerId}
            initialData={initialData}
            advanceRequestId={advanceRequestId}
        />
    );
}
