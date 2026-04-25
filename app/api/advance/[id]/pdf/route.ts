import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { workerTable } from "@/db/tables/workerTable";
import { generatePdf } from "@/services/pdf/generate-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeFilenamePart(s: string): string {
    return String(s).replace(/[/\\:*?"<>|]/g, "-").trim();
}

function isoToDdmmyyyy(val: unknown): string {
    const s = String(val instanceof Date ? val.toISOString() : val).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}_${m}_${y}`;
}

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const { id } = await ctx.params;

    const url = `${req.nextUrl.origin}/dashboard/advance/${id}/summary?print=1`;

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
    const requestDate = isoToDdmmyyyy(meta?.requestDate ?? "");
    const filename = safeFilenamePart(
        `${workerName} - Advance - $${amount} - ${requestDate}.pdf`,
    );

    return new Response(new Uint8Array(pdf), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
