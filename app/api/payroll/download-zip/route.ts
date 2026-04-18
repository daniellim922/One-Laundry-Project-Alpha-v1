import { NextRequest } from "next/server";
import archiver from "archiver";
import { Readable } from "node:stream";
import { eq, inArray } from "drizzle-orm";

import { requireCurrentApiAdminUser } from "@/app/api/_shared/auth";
import { apiError } from "@/app/api/_shared/responses";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";

export const runtime = "nodejs";

type Body = { payrollIds?: unknown };
type PayrollPdfFailure = { payrollId: string; reason: string };
type PayrollPdfEntry = { name: string; buffer: Buffer };

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

export function dedupeStringsPreserveOrder(values: string[]): string[] {
    return Array.from(new Set(values));
}

function appendNumericSuffix(filename: string, n: number): string {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot <= 0) return `${filename} (${n})`;
    const stem = filename.slice(0, lastDot);
    const ext = filename.slice(lastDot);
    return `${stem} (${n})${ext}`;
}

export function makeUniqueZipEntryName(
    baseName: string,
    seenNames: Map<string, number>,
): string {
    const count = seenNames.get(baseName) ?? 0;
    seenNames.set(baseName, count + 1);
    if (count === 0) return baseName;
    return appendNumericSuffix(baseName, count + 1);
}

export function createPayrollPdfBaseName(args: {
    workerName: string;
    periodStart: string;
    periodEnd: string;
}): string {
    return safeFilenamePart(
        `${args.workerName} - ${args.periodStart}-${args.periodEnd}.pdf`,
    );
}

export function formatDownloadErrorsReport(
    failures: PayrollPdfFailure[],
): string {
    const lines = [
        "Some payroll PDFs failed to generate.",
        "",
        ...failures.map((f) => `- ${f.payrollId}: ${f.reason}`),
        "",
    ];
    return lines.join("\n");
}

export function createZipFilename(args: {
    periodStart: string;
    periodEnd: string;
    partial: boolean;
}): string {
    const partialSuffix = args.partial ? "-partial" : "";
    return safeFilenamePart(
        `payrolls-${args.periodStart}-${args.periodEnd}${partialSuffix}.zip`,
    );
}

export async function POST(req: NextRequest) {
    const auth = await requireCurrentApiAdminUser();
    if (auth instanceof Response) {
        return auth;
    }

    let parsed: Body;
    try {
        parsed = (await req.json()) as Body;
    } catch {
        return apiError({
            status: 400,
            code: "INVALID_JSON",
            message: "Invalid JSON",
        });
    }

    const payrollIdsRaw = Array.isArray(parsed.payrollIds)
        ? (parsed.payrollIds as unknown[]).filter((x) => typeof x === "string")
        : [];
    const payrollIds = dedupeStringsPreserveOrder(payrollIdsRaw);

    if (payrollIds.length === 0) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "No payrollIds provided",
        });
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

    const failures: PayrollPdfFailure[] = [];
    const pdfEntries: PayrollPdfEntry[] = [];
    const seenNames = new Map<string, number>();

    for (const id of payrollIds) {
        try {
            const url = `${origin}/api/payroll/${id}/pdf?mode=summary`;
            const res = await fetch(url, {
                headers: cookie ? { cookie } : undefined,
                cache: "no-store",
            });
            if (!res.ok) {
                const reason = `PDF failed (${res.status})`;
                failures.push({ payrollId: id, reason });
                console.warn(`[payroll/download-zip] Failed to fetch PDF`, {
                    payrollId: id,
                    status: res.status,
                });
                continue;
            }
            const buf = Buffer.from(await res.arrayBuffer());

            const meta = metaById.get(id);
            const workerName = meta?.workerName ?? `payroll-${id}`;
            const periodStart = isoToDdmmyyyy(isoDate(meta?.periodStart ?? ""));
            const periodEnd = isoToDdmmyyyy(isoDate(meta?.periodEnd ?? ""));
            const baseName = createPayrollPdfBaseName({
                workerName,
                periodStart,
                periodEnd,
            });
            const uniqueName = makeUniqueZipEntryName(baseName, seenNames);
            if (uniqueName !== baseName) {
                console.warn(`[payroll/download-zip] Duplicate filename collision`, {
                    payrollId: id,
                    baseName,
                    uniqueName,
                });
            }

            pdfEntries.push({
                name: uniqueName,
                buffer: buf,
            });
        } catch (error) {
            const reason =
                error instanceof Error ? error.message : "Unknown error";
            failures.push({ payrollId: id, reason });
            console.warn(`[payroll/download-zip] PDF processing error`, {
                payrollId: id,
                reason,
            });
        }
    }

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const zip = archiver("zip", { zlib: { level: 9 } });

            zip.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
            zip.on("end", () => controller.close());
            zip.on("warning", (err: unknown) => {
                controller.error(err);
            });
            zip.on("error", (err: unknown) => controller.error(err));

            (async () => {
                try {
                    for (const entry of pdfEntries) {
                        zip.append(Readable.from(entry.buffer), {
                            name: entry.name,
                        });
                    }
                    if (failures.length > 0) {
                        const report = formatDownloadErrorsReport(failures);
                        zip.append(report, { name: "_download-errors.txt" });
                    }
                    await zip.finalize();
                } catch (e) {
                    controller.error(e);
                }
            })();
        },
    });

    const zipName = createZipFilename({
        periodStart: periodStartForZipLabel,
        periodEnd: periodEndForZipLabel,
        partial: failures.length > 0,
    });
    const zipNameStar = encodeURIComponent(zipName);

    return new Response(stream, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${zipName}"; filename*=UTF-8''${zipNameStar}`,
            "Cache-Control": "no-store",
        },
    });
}
