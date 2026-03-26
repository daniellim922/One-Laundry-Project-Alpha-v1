import { NextRequest } from "next/server";
import archiver from "archiver";
import { Readable } from "node:stream";
import { eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { workerTable } from "@/db/tables/payroll/workerTable";

export const runtime = "nodejs";

type Body = { payrollIds?: unknown };

async function requireApiPermission(req: NextRequest) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        return { ok: false as const, status: 401 as const };
    }
    const allowed = await checkPermission(session.user.id, "Payroll", "read");
    if (!allowed) {
        return { ok: false as const, status: 403 as const };
    }
    return { ok: true as const, userId: session.user.id };
}

function safeFilenamePart(s: string): string {
    return String(s).replace(/[/\\:*?"<>|]/g, "-").trim();
}

function isoDate(val: unknown): string {
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val).slice(0, 10);
}

function isoToDdmmyyyy(iso: string): string {
    // Expect ISO date `YYYY-MM-DD`
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}_${m}_${y}`;
}

export async function POST(req: NextRequest) {
    const perm = await requireApiPermission(req);
    if (!perm.ok) {
        return new Response("Unauthorized", { status: perm.status });
    }

    let parsed: Body;
    try {
        parsed = (await req.json()) as Body;
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const payrollIds = Array.isArray(parsed.payrollIds)
        ? (parsed.payrollIds as unknown[]).filter((x) => typeof x === "string")
        : [];

    if (payrollIds.length === 0) {
        return new Response("No payrollIds provided", { status: 400 });
    }

    const payrollMeta = await db
        .select({
            id: payrollTable.id,
            periodStart: payrollTable.periodStart,
            periodEnd: payrollTable.periodEnd,
            workerName: workerTable.name,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .where(inArray(payrollTable.id, payrollIds));

    const metaById = new Map(payrollMeta.map((m) => [m.id, m]));
    const starts = payrollMeta.map((m) => isoDate(m.periodStart));
    const ends = payrollMeta.map((m) => isoDate(m.periodEnd));

    const periodStartForZip =
        starts.length > 0 ? starts.slice().sort()[0]! : new Date().toISOString().slice(0, 10);
    const periodEndForZip =
        ends.length > 0 ? ends.slice().sort().at(-1)! : new Date().toISOString().slice(0, 10);

    const periodStartForZipLabel = isoToDdmmyyyy(periodStartForZip);
    const periodEndForZipLabel = isoToDdmmyyyy(periodEndForZip);

    const cookie = req.headers.get("cookie") ?? "";
    const origin = req.nextUrl.origin;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const zip = archiver("zip", { zlib: { level: 9 } });

            zip.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
            zip.on("end", () => controller.close());
            zip.on("warning", (err: unknown) => {
                // Treat warnings as fatal to avoid silent corrupt zips.
                controller.error(err);
            });
            zip.on("error", (err: unknown) => controller.error(err));

            (async () => {
                try {
                    for (const id of payrollIds) {
                        const url = `${origin}/api/payroll/${id}/pdf?mode=summary`;
                        const res = await fetch(url, {
                            headers: cookie ? { cookie } : undefined,
                            cache: "no-store",
                        });
                        if (!res.ok) {
                            throw new Error(`PDF failed for ${id} (${res.status})`);
                        }
                        const buf = Buffer.from(await res.arrayBuffer());

                        const meta = metaById.get(id);
                        const workerName = meta?.workerName ?? `payroll-${id}`;
                        const periodStart = isoToDdmmyyyy(isoDate(meta?.periodStart ?? ""));
                        const periodEnd = isoToDdmmyyyy(isoDate(meta?.periodEnd ?? ""));

                        zip.append(Readable.from(buf), {
                            name: safeFilenamePart(
                                `${workerName} - ${periodStart}-${periodEnd}.pdf`,
                            ),
                        });
                    }
                    await zip.finalize();
                } catch (e) {
                    controller.error(e);
                }
            })();
        },
    });

    const zipName = safeFilenamePart(
        `payrolls-${periodStartForZipLabel}-${periodEndForZipLabel}.zip`,
    );
    const zipNameStar = encodeURIComponent(zipName);

    return new Response(stream, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${zipName}"; filename*=UTF-8''${zipNameStar}`,
            "Cache-Control": "no-store",
        },
    });
}

