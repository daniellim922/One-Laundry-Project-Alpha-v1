import { pdf } from "@react-pdf/renderer";

import { createClient } from "@/lib/supabase/client";
import {
    uploadPdf,
    payrollStoragePath,
    advanceStoragePath,
} from "@/lib/supabase/storage";
import {
    PayrollPdfDocument,
    AdvanceVoucherDocument,
    type PayrollPdfData,
    type AdvanceVoucherData,
} from "@/services/pdf/react-pdf";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const body = (await res.json()) as ApiOk<T> | ApiFail;
    if (!body.ok) throw new Error(body.error.message);
    return body.data;
}

async function patchStoragePath(url: string, storagePath: string) {
    const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
    });
    if (!res.ok) throw new Error(`Failed to save storage path (${res.status})`);
}

export type PayrollPdfResult = {
    payrollId: string;
    blob: Blob;
    storagePath: string;
};

/**
 * Fetch payroll PDF data, render to blob, upload to Supabase Storage,
 * and persist the storage path on the payroll record.
 */
export async function generateAndUploadPayrollPdf(
    payrollId: string,
): Promise<PayrollPdfResult> {
    const data = await fetchJson<PayrollPdfData>(
        `/api/payroll/${payrollId}/pdf-data`,
    );

    const blob = await pdf(PayrollPdfDocument({ data })).toBlob();

    const supabase = createClient();
    const path = payrollStoragePath(payrollId);
    await uploadPdf(supabase, path, blob);
    await patchStoragePath(`/api/payroll/${payrollId}/pdf-storage-path`, path);

    return { payrollId, blob, storagePath: path };
}

export type AdvancePdfResult = {
    advanceRequestId: string;
    blob: Blob;
    storagePath: string;
};

/**
 * Fetch advance PDF data, render to blob, upload to Supabase Storage,
 * and persist the storage path on the advance request record.
 */
export async function generateAndUploadAdvancePdf(
    advanceRequestId: string,
): Promise<AdvancePdfResult> {
    const data = await fetchJson<AdvanceVoucherData>(
        `/api/advance/${advanceRequestId}/pdf-data`,
    );

    const blob = await pdf(AdvanceVoucherDocument({ data })).toBlob();

    const supabase = createClient();
    const path = advanceStoragePath(advanceRequestId);
    await uploadPdf(supabase, path, blob);
    await patchStoragePath(
        `/api/advance/${advanceRequestId}/pdf-storage-path`,
        path,
    );

    return { advanceRequestId, blob, storagePath: path };
}
