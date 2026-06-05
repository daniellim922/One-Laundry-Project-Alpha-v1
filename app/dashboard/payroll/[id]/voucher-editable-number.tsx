"use client";

import { useMemo } from "react";

import { updateVoucherDays } from "../command-api";
import { VoucherEditableField } from "./voucher-editable-field";

type Props = {
    payrollId: string;
    voucherId: string;
    label: string;
    field: "restDays" | "publicHolidays";
    restDays: number | null;
    publicHolidays: number | null;
    readOnly?: boolean;
    /** Larger typography for dense summary / voucher tape rows */
    size?: "default" | "lg";
    /** Full-width input, left-aligned (e.g. merged voucher card grid). */
    fullWidth?: boolean;
};

function parseNumber(text: string): number | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
}

export function VoucherEditableNumber({
    payrollId,
    voucherId,
    label,
    field,
    restDays,
    publicHolidays,
    readOnly = false,
    size = "default",
    fullWidth = false,
}: Props) {
    const currentValue = field === "restDays" ? restDays : publicHolidays;
    const committedDisplay = useMemo(
        () => (currentValue == null ? "" : String(currentValue)),
        [currentValue],
    );

    return (
        <VoucherEditableField
            label={label}
            readOnly={readOnly}
            size={size}
            fullWidth={fullWidth}
            align={fullWidth ? "left" : "right"}
            committedDisplay={committedDisplay}
            parseForCommit={(text) => {
                const parsed = parseNumber(text);
                const numeric = parsed ?? 0;
                if (numeric < 0) {
                    return { ok: false, error: "Must be ≥ 0" };
                }
                return { ok: true, value: numeric };
            }}
            commit={async (numeric) => {
                const n = numeric ?? 0;
                const nextRestDays =
                    field === "restDays" ? n : (restDays ?? 0);
                const nextPublicHolidays =
                    field === "publicHolidays" ? n : (publicHolidays ?? 0);

                return updateVoucherDays({
                    payrollId,
                    voucherId,
                    restDays: nextRestDays,
                    publicHolidays: nextPublicHolidays,
                });
            }}
        />
    );
}
