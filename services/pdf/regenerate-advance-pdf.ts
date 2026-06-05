import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceStoragePath, uploadPdf } from "@/lib/supabase/storage";
import { AdvanceVoucherDocument } from "@/services/pdf/react-pdf";
import { buildAdvancePdfData } from "@/services/pdf/build-advance-pdf-data";

/**
 * Server-side advance voucher PDF (re)generation. Mirrors
 * {@link regeneratePayrollPdf}: renders live advance data to a Buffer,
 * overwrites the stored object, and persists
 * `advanceRequestTable.pdfStoragePath`.
 *
 * Best-effort by contract: failures are logged and swallowed. Run post-commit.
 */
export async function regenerateAdvancePdf(
    advanceRequestId: string,
    supabase: SupabaseClient,
): Promise<void> {
    try {
        const data = await buildAdvancePdfData(advanceRequestId);
        if (!data) {
            return;
        }

        const buffer = await renderToBuffer(AdvanceVoucherDocument({ data }));
        const path = advanceStoragePath(advanceRequestId);
        await uploadPdf(supabase, path, buffer);

        await db
            .update(advanceRequestTable)
            .set({ pdfStoragePath: path })
            .where(eq(advanceRequestTable.id, advanceRequestId));
    } catch (error) {
        console.error("Failed to regenerate advance PDF", {
            advanceRequestId,
            error,
        });
    }
}
