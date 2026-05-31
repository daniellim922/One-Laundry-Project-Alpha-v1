"use client";

import { Controller, type Control } from "react-hook-form";
import { Globe, Mail, Phone, User, Users } from "lucide-react";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { RequiredMark } from "@/app/dashboard/worker/_shared/required-mark";

type WorkerIdentityFieldsProps = {
    control: Control<WorkerUpsertFormInput>;
    formId: string;
    disabled?: boolean;
};

export function WorkerIdentityFields({
    control,
    formId,
    disabled = false,
}: WorkerIdentityFieldsProps) {
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2">
                <Controller
                    name="name"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-name`}>
                                Name
                                <RequiredMark />
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    id={`${formId}-name`}
                                    aria-invalid={fieldState.invalid}
                                    aria-required
                                    disabled={disabled}
                                />
                                <InputGroupAddon>
                                    <User className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Controller
                    name="email"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-email`}>
                                Email
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    value={field.value ?? ""}
                                    id={`${formId}-email`}
                                    type="email"
                                    aria-invalid={fieldState.invalid}
                                    disabled={disabled}
                                />
                                <InputGroupAddon>
                                    <Mail className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="phone"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-phone`}>
                                Phone
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    value={field.value ?? ""}
                                    id={`${formId}-phone`}
                                    aria-invalid={fieldState.invalid}
                                    disabled={disabled}
                                />
                                <InputGroupAddon>
                                    <Phone className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Controller
                    name="countryOfOrigin"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-countryOfOrigin`}>
                                Country of Origin
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    value={field.value ?? ""}
                                    id={`${formId}-countryOfOrigin`}
                                    aria-invalid={fieldState.invalid}
                                    disabled={disabled}
                                />
                                <InputGroupAddon>
                                    <Globe className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="race"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="space-y-2">
                            <FieldLabel htmlFor={`${formId}-race`}>
                                Race
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    value={field.value ?? ""}
                                    id={`${formId}-race`}
                                    aria-invalid={fieldState.invalid}
                                    disabled={disabled}
                                />
                                <InputGroupAddon>
                                    <Users className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </div>
        </>
    );
}
