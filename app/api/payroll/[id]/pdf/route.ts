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
import { payrollTable } from "@/db/tables/payrollTable";
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
            periodStart: payrollTable.periodStart,
            periodEnd: payrollTable.periodEnd,
            pdfStoragePath: payrollTable.pdfStoragePath,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .where(eq(payrollTable.id, id))
        .limit(1);

    if (!row) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Payroll record not found",
        });
    }

    if (!row.pdfStoragePath) {
        return apiError({
            status: 404,
            code: "PDF_NOT_AVAILABLE",
            message:
                "PDF not available for this payroll. It may have been created before PDF storage was enabled.",
        });
    }

    const supabase = await createClient();
    let blob: Blob;
    try {
        blob = await downloadPdf(supabase, row.pdfStoragePath);
    } catch (error) {
        console.error("[payroll/pdf] Storage download failed", { id, error });
        return apiError({
            status: 502,
            code: "STORAGE_ERROR",
            message: "Failed to download PDF from storage",
        });
    }

    const workerName = row.workerName ?? `payroll-${id}`;
    const periodStart = isoToDdmmyyyy(isoDate(row.periodStart ?? ""));
    const periodEnd = isoToDdmmyyyy(isoDate(row.periodEnd ?? ""));
    const filename = safeFilenamePart(
        `${workerName} - ${periodStart}-${periodEnd}.pdf`,
    );

    return pdfAttachmentResponse(
        Buffer.from(await blob.arrayBuffer()),
        filename,
    );
}
