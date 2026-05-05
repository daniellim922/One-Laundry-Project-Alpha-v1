"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { generateAndUploadPayrollPdf } from "@/lib/client/generate-and-upload-pdf";
import { requestUpdateVoucherPayRate } from "../command-api";
import { VoucherEditableField } from "./voucher-editable-field";
import type { VoucherPayRateField } from "@/services/payroll/update-voucher-pay-rates";

export type VoucherPdfRegenerationStatus =
    | "idle"
    | "generating"
    | "done"
    | "failed";

type Props = {
    payrollId: string;
    voucherId: string;
    label: string;
    field: VoucherPayRateField;
    value: number | null;
    readOnly?: boolean;
    size?: "default" | "lg";
    /** Hours-style numbers without a $ prefix. */
    format?: "currency" | "plain";
    /** Full-width input in grid layouts; default keeps compact pay-rate fields. */
    fullWidth?: boolean;
    /** Fired when a stored PDF is regenerated after a successful commit (draft flows). */
    onPdfRegenerationStatus?: (status: VoucherPdfRegenerationStatus) => void;
};

function parseAmount(text: string, format: "currency" | "plain"): number | null {
    const stripped =
        format === "currency" ? text.replace(/^\$/, "").trim() : text.trim();
    if (!stripped) return null;
    const n = Number(stripped);
    if (!Number.isFinite(n)) return null;
    return n;
}

function formatInitial(n: number | null): string {
    if (n == null) return "";
    return n === 0 ? "0" : String(n);
}

export function VoucherEditableMoney({
    payrollId,
    voucherId,
    label,
    field,
    value,
    readOnly = false,
    size = "default",
    format = "currency",
    fullWidth = false,
    onPdfRegenerationStatus,
}: Props) {
    const isLg = size === "lg";
    const committedDisplay = useMemo(() => formatInitial(value), [value]);

    const prefixSlot =
        format === "currency" ? (
            <span
                className={cn(
                    "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground",
                    isLg ? "text-base" : "text-sm",
                )}
                aria-hidden>
                $
            </span>
        ) : undefined;

    return (
        <VoucherEditableField
            label={label}
            readOnly={readOnly}
            size={size}
            fullWidth={fullWidth}
            align="left"
            prefixSlot={prefixSlot}
            committedDisplay={committedDisplay}
            parseForCommit={(text) => {
                const parsed = parseAmount(text, format);
                const numeric =
                    field === "minimumWorkingHours" ? parsed : (parsed ?? 0);
                if (numeric !== null && numeric < 0) {
                    return { ok: false, error: "Must be ≥ 0" };
                }
                return { ok: true, value: numeric };
            }}
            commit={(numeric) =>
                requestUpdateVoucherPayRate({
                    payrollId,
                    voucherId,
                    field,
                    value: numeric,
                })
            }
            onAfterCommit={() => {
                const notify = onPdfRegenerationStatus;
                notify?.("generating");
                generateAndUploadPayrollPdf(payrollId)
                    .then(() => {
                        notify?.("done");
                        setTimeout(() => notify?.("idle"), 3000);
                    })
                    .catch(() => {
                        notify?.("failed");
                        setTimeout(() => notify?.("idle"), 5000);
                    });
            }}
        />
    );
}
