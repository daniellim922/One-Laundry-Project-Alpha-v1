import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "documents";

export type StoragePath =
    | `payroll/${string}/voucher.pdf`
    | `advance/${string}/voucher.pdf`;

export function payrollStoragePath(payrollId: string): StoragePath {
    return `payroll/${payrollId}/voucher.pdf`;
}

export function advanceStoragePath(advanceRequestId: string): StoragePath {
    return `advance/${advanceRequestId}/voucher.pdf`;
}

export async function uploadPdf(
    client: SupabaseClient,
    path: StoragePath,
    blob: Blob,
) {
    const { error } = await client.storage.from(BUCKET).upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return path;
}

export async function downloadPdf(
    client: SupabaseClient,
    path: string,
): Promise<Blob> {
    const { data, error } = await client.storage.from(BUCKET).download(path);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return data;
}
