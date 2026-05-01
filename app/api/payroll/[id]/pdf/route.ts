import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handlePdfExport } from "@/app/api/_shared/pdf-export-handler";
import {
    isoDate,
    isoToDdmmyyyy,
} from "@/app/api/_shared/pdf-filenames";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const mode = req.nextUrl.searchParams.get("mode") ?? "summary";

    return handlePdfExport(req, ctx, {
        buildPrintUrl: (origin, id) =>
            mode === "voucher"
                ? `${origin}/dashboard/payroll/${id}/summary?mode=voucher&print=1`
                : `${origin}/dashboard/payroll/${id}/summary?print=1`,
        fetchMeta: async (id) => {
            const [row] = await db
                .select({
                    workerName: workerTable.name,
                    periodStart: payrollTable.periodStart,
                    periodEnd: payrollTable.periodEnd,
                })
                .from(payrollTable)
                .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
                .where(eq(payrollTable.id, id))
                .limit(1);
            return { row, mode };
        },
        buildFilename: (id, { row: meta, mode }) => {
            const workerName = meta?.workerName ?? `payroll-${id}`;
            const periodStart = isoToDdmmyyyy(
                isoDate(meta?.periodStart ?? ""),
            );
            const periodEnd = isoToDdmmyyyy(isoDate(meta?.periodEnd ?? ""));
            const suffix = mode === "voucher" ? " (voucher)" : "";
            return `${workerName} - ${periodStart}-${periodEnd}${suffix}.pdf`;
        },
    });
}
