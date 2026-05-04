import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import {
    isoDate,
    isoToDdmmyyyy,
    safeFilenamePart,
} from "@/app/api/_shared/pdf-filenames";
import { pdfAttachmentResponse } from "@/app/api/_shared/pdf-filenames";
import { apiError } from "@/app/api/_shared/responses";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { downloadPdf } from "@/lib/supabase/storage";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { workerTable } from "@/db/tables/workerTable";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    const [row] = await db
        .select({
            workerName: workerTable.name,
            amountRequested: advanceRequestTable.amountRequested,
            requestDate: advanceRequestTable.requestDate,
            pdfStoragePath: advanceRequestTable.pdfStoragePath,
        })
        .from(advanceRequestTable)
        .innerJoin(
            workerTable,
            eq(advanceRequestTable.workerId, workerTable.id),
        )
        .where(eq(advanceRequestTable.id, id))
        .limit(1);

    if (!row) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Advance request not found",
        });
    }

    if (!row.pdfStoragePath) {
        return apiError({
            status: 404,
            code: "PDF_NOT_AVAILABLE",
            message:
                "PDF not available for this advance. It may have been created before PDF storage was enabled.",
        });
    }

    const supabase = await createClient();
    let blob: Blob;
    try {
        blob = await downloadPdf(supabase, row.pdfStoragePath);
    } catch (error) {
        console.error("[advance/pdf] Storage download failed", { id, error });
        return apiError({
            status: 502,
            code: "STORAGE_ERROR",
            message: "Failed to download PDF from storage",
        });
    }

    const workerName = row.workerName ?? `advance-${id}`;
    const amount = row.amountRequested ?? 0;
    const requestDate = isoToDdmmyyyy(isoDate(row.requestDate ?? ""));
    const filename = safeFilenamePart(
        `${workerName} - Advance - $${amount} - ${requestDate}.pdf`,
    );

    return pdfAttachmentResponse(
        Buffer.from(await blob.arrayBuffer()),
        filename,
    );
}
