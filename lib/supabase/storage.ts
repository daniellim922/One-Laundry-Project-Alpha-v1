import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

const BUCKET = "documents";

/** Top-level prefixes that hold app PDFs (see payrollStoragePath / advanceStoragePath). */
const DOCUMENT_ROOT_PREFIXES = ["payroll", "advance"] as const;

const LIST_PAGE_SIZE = 1000;

/** Files returned by `list` include `id`; folder placeholders do not. */
function isStoredFile(entry: { id?: string | null }): boolean {
    return entry.id != null && entry.id !== "";
}

async function listPrefixPaginated(
    client: SupabaseClient,
    prefix: string,
): Promise<Array<{ name: string; id?: string | null }>> {
    const results: Array<{ name: string; id?: string | null }> = [];
    for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
        const { data, error } = await client.storage
            .from(BUCKET)
            .list(prefix, { limit: LIST_PAGE_SIZE, offset });
        if (error) {
            throw new Error(
                `Storage list failed for "${prefix || "(bucket root)"}": ${error.message}`,
            );
        }
        const batch = data ?? [];
        results.push(...batch);
        if (batch.length < LIST_PAGE_SIZE) break;
    }
    return results;
}

async function collectFilePathsUnderPrefix(
    client: SupabaseClient,
    prefix: string,
): Promise<string[]> {
    const entries = await listPrefixPaginated(client, prefix);
    const paths: string[] = [];
    for (const entry of entries) {
        const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
        if (isStoredFile(entry)) {
            paths.push(path);
        } else {
            paths.push(...(await collectFilePathsUnderPrefix(client, path)));
        }
    }
    return paths;
}

/**
 * Deletes every object under `payroll/` and `advance/` in the documents bucket.
 * Uses the public anon key from `env` (same as local Supabase dev defaults).
 * Intended for `db:reset` / dev workflows.
 */
export async function wipeStorage(): Promise<void> {
    console.log("Clearing Supabase documents bucket (payroll, advance)...");
    const client = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );

    const paths: string[] = [];
    for (const root of DOCUMENT_ROOT_PREFIXES) {
        paths.push(...(await collectFilePathsUnderPrefix(client, root)));
    }

    if (paths.length === 0) {
        console.log("No objects found under payroll/ or advance/.");
        return;
    }

    const chunkSize = 100;
    for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        const { error } = await client.storage.from(BUCKET).remove(chunk);
        if (error) {
            throw new Error(`Storage delete failed: ${error.message}`);
        }
    }

    console.log(`Removed ${paths.length} object(s) from documents bucket.`);
}

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
