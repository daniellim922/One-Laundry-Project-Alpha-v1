import { NextRequest } from "next/server";
import { chromium } from "playwright";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";

export const runtime = "nodejs";

function safeFilenamePart(s: string): string {
    return String(s).replace(/[/\\:*?"<>|]/g, "-").trim();
}

function isoDate(val: unknown): string {
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val).slice(0, 10);
}

function isoToDdmmyyyy(iso: string): string {
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}_${m}_${y}`;
}

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const { id } = await ctx.params;

    const mode = req.nextUrl.searchParams.get("mode") ?? "summary";
    const url =
        mode === "voucher"
            ? `${req.nextUrl.origin}/dashboard/payroll/${id}/summary?mode=voucher&print=1`
            : `${req.nextUrl.origin}/dashboard/payroll/${id}/summary?print=1`;

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

    const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox"],
    });
    try {
        const page = await browser.newPage({
            viewport: { width: 1240, height: 1754 },
        });

        await page.goto(url, { waitUntil: "networkidle" });
        await page.emulateMedia({ media: "print" });
        await page.evaluate(async () => {
            // Ensure web fonts are ready so spacing/weights match UI.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fonts = (document as any).fonts;
            if (fonts?.ready) await fonts.ready;
        });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            scale: 1,
            margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
        });

        const workerName = meta?.workerName ?? `payroll-${id}`;
        const periodStart = isoToDdmmyyyy(isoDate(meta?.periodStart ?? ""));
        const periodEnd = isoToDdmmyyyy(isoDate(meta?.periodEnd ?? ""));
        const suffix = mode === "voucher" ? " (voucher)" : "";
        const filename = safeFilenamePart(
            `${workerName} - ${periodStart}-${periodEnd}${suffix}.pdf`,
        );

        return new Response(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } finally {
        await browser.close();
    }
}
