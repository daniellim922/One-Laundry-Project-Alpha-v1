import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handlePdfExport } from "@/app/api/_shared/pdf-export-handler";
import {
    isoDate,
    isoToDdmmyyyy,
} from "@/app/api/_shared/pdf-filenames";
import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { workerTable } from "@/db/tables/workerTable";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    return handlePdfExport(req, ctx, {
        buildPrintUrl: (origin, id) =>
            `${origin}/dashboard/advance/${id}/summary?print=1`,
        fetchMeta: async (id) => {
            const [row] = await db
                .select({
                    workerName: workerTable.name,
                    amountRequested: advanceRequestTable.amountRequested,
                    requestDate: advanceRequestTable.requestDate,
                })
                .from(advanceRequestTable)
                .innerJoin(
                    workerTable,
                    eq(advanceRequestTable.workerId, workerTable.id),
                )
                .where(eq(advanceRequestTable.id, id))
                .limit(1);
            return row;
        },
        buildFilename: (id, meta) => {
            const workerName = meta?.workerName ?? `advance-${id}`;
            const amount = meta?.amountRequested ?? 0;
            const requestDate = isoToDdmmyyyy(
                isoDate(meta?.requestDate ?? ""),
            );
            return `${workerName} - Advance - $${amount} - ${requestDate}.pdf`;
        },
    });
}
