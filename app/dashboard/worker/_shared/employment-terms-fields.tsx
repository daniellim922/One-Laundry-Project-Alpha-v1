"use client";

import { type Control } from "react-hook-form";
import { Banknote, Briefcase, Clock, Users } from "lucide-react";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";
import { SegmentedTwoChoiceField } from "../segmented-two-choice-field";
import {
    EMPLOYMENT_ARRANGEMENT_SEGMENT_OPTIONS,
    EMPLOYMENT_TYPE_SEGMENT_OPTIONS,
    SHIFT_PATTERN_SEGMENT_OPTIONS,
} from "./employment-segment-options";
import { WorkerNumericControllerField } from "./worker-numeric-controller-field";

type EmploymentTermsFieldsProps = {
    control: Control<WorkerUpsertFormInput>;
    formId: string;
    disabled?: boolean;
    isFullTime: boolean;
    isLocalWorker: boolean;
};

export function EmploymentTermsFields({
    control,
    formId,
    disabled = false,
    isFullTime,
    isLocalWorker,
}: EmploymentTermsFieldsProps) {
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2">
                <SegmentedTwoChoiceField
                    control={control}
                    name="employmentType"
                    label="Employment Type"
                    icon={<Briefcase className="size-4" />}
                    disabled={disabled}
                    options={EMPLOYMENT_TYPE_SEGMENT_OPTIONS}
                    ariaLabel="Employment type"
                />
                <SegmentedTwoChoiceField
                    control={control}
                    name="employmentArrangement"
                    label="Employment Arrangement"
                    icon={<Users className="size-4" />}
                    disabled={disabled}
                    options={EMPLOYMENT_ARRANGEMENT_SEGMENT_OPTIONS}
                    ariaLabel="Employment arrangement"
                />
            </div>

            <SegmentedTwoChoiceField
                control={control}
                name="shiftPattern"
                label="Shift Pattern"
                icon={<Clock className="size-4" />}
                disabled={disabled}
                options={SHIFT_PATTERN_SEGMENT_OPTIONS}
                ariaLabel="Shift pattern"
            />

            <div className="grid gap-4 md:grid-cols-5">
                <WorkerNumericControllerField
                    control={control}
                    name="monthlyPay"
                    formId={formId}
                    label="Monthly Pay"
                    icon={Banknote}
                    required
                    inputMode="decimal"
                    visible={isFullTime}
                    disabled={disabled}
                />
                <WorkerNumericControllerField
                    control={control}
                    name="hourlyRate"
                    formId={formId}
                    label="Hourly Rate"
                    icon={Banknote}
                    required
                    inputMode="decimal"
                    disabled={disabled}
                />
                <WorkerNumericControllerField
                    control={control}
                    name="restDayRate"
                    formId={formId}
                    label="Rest Day Rate"
                    icon={Banknote}
                    required
                    inputMode="decimal"
                    visible={isFullTime}
                    disabled={disabled}
                />
                <WorkerNumericControllerField
                    control={control}
                    name="minimumWorkingHours"
                    formId={formId}
                    label="Minimum Working Hours"
                    icon={Clock}
                    inputMode="numeric"
                    visible={isFullTime}
                    disabled={disabled}
                />
                <WorkerNumericControllerField
                    control={control}
                    name="cpf"
                    formId={formId}
                    label="CPF"
                    icon={Banknote}
                    inputMode="decimal"
                    visible={isLocalWorker}
                    disabled={disabled}
                />
            </div>
        </>
    );
}
