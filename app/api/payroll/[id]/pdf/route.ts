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
import { payrollTable } from "@/db/tables/payrollTable";
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

    const mode = req.nextUrl.searchParams.get("mode") ?? "summary";
    const origin = getRequestOrigin(req);
    const url =
        mode === "voucher"
            ? `${origin}/dashboard/payroll/${id}/summary?mode=voucher&print=1`
            : `${origin}/dashboard/payroll/${id}/summary?print=1`;

    const [meta] = await db
        .select({
            workerName: workerTable.name,
            periodStart: payrollTable.periodStart,
            periodEnd: payrollTable.periodEnd,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .where(eq(payrollTable.id, id))
        .limit(1);

    const pdf = await generatePdf({
        url,
        cookieHeader: req.headers.get("cookie") ?? undefined,
    });

    const workerName = meta?.workerName ?? `payroll-${id}`;
    const periodStart = isoToDdmmyyyy(isoDate(meta?.periodStart ?? ""));
    const periodEnd = isoToDdmmyyyy(isoDate(meta?.periodEnd ?? ""));
    const suffix = mode === "voucher" ? " (voucher)" : "";
    const filename = safeFilenamePart(
        `${workerName} - ${periodStart}-${periodEnd}${suffix}.pdf`,
    );

    return pdfAttachmentResponse(pdf, filename);
}
