import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import {
    isoDate,
    isoToDdmmyyyy,
    pdfAttachmentResponse,
    safeFilenamePart,
} from "@/app/api/_shared/pdf-filenames";
import { getRequestOrigin } from "@/app/api/_shared/origin";
import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { workerTable } from "@/db/tables/workerTable";
import { generatePdf } from "@/services/pdf/generate-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const { id } = await ctx.params;

    const origin = getRequestOrigin(req);
    const url = `${origin}/dashboard/advance/${id}/summary?print=1`;

    const [meta] = await db
        .select({
            workerName: workerTable.name,
            amountRequested: advanceRequestTable.amountRequested,
            requestDate: advanceRequestTable.requestDate,
        })
        .from(advanceRequestTable)
        .innerJoin(workerTable, eq(advanceRequestTable.workerId, workerTable.id))
        .where(eq(advanceRequestTable.id, id))
        .limit(1);

    const pdf = await generatePdf({
        url,
        cookieHeader: req.headers.get("cookie") ?? undefined,
    });

    const workerName = meta?.workerName ?? `advance-${id}`;
    const amount = meta?.amountRequested ?? 0;
    const requestDate = isoToDdmmyyyy(isoDate(meta?.requestDate ?? ""));
    const filename = safeFilenamePart(
        `${workerName} - Advance - $${amount} - ${requestDate}.pdf`,
    );

    return pdfAttachmentResponse(pdf, filename);
}
