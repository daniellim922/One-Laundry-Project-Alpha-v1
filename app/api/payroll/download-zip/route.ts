import { NextRequest } from "next/server";
import archiver from "archiver";
import { Readable } from "node:stream";
import { eq, inArray } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { isoDate, isoToDdmmyyyy, safeFilenamePart } from "@/app/api/_shared/pdf-filenames";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError } from "@/app/api/_shared/responses";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { downloadPdf } from "@/lib/supabase/storage";
import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";
import { recordGuidedMonthlyWorkflowStepCompletion } from "@/services/payroll/guided-monthly-workflow-activity";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { payrollIds?: unknown };
type PayrollPdfFailure = { payrollId: string; reason: string };
type PayrollPdfEntry = { name: string; buffer: Buffer };

type PayrollMetaRow = {
    id: string;
    periodStart: unknown;
    periodEnd: unknown;
    workerName: string;
    pdfStoragePath: string | null;
};

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
        "Some payroll PDFs failed to download.",
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
    return safeFilenamePart(
        `payrolls-${args.periodStart}-${args.periodEnd}${args.partial ? "-partial" : ""}.zip`,
    );
}

async function recordPayrollDownloadWorkflowCompletion() {
    try {
        await recordGuidedMonthlyWorkflowStepCompletion({
            stepId: "payroll_download",
        });
        revalidateTransportPaths(["/dashboard"]);
    } catch (error) {
        console.warn(
            "Failed to record guided monthly workflow completion for payroll download",
            error,
        );
    }
}

function enqueueNdjsonLine(
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
    obj: object,
) {
    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
}

async function collectPdfEntries(args: {
    payrollIds: string[];
    metaById: Map<string, PayrollMetaRow>;
    supabaseClient: Awaited<ReturnType<typeof createClient>>;
    failures: PayrollPdfFailure[];
    onProgress?: (i: number, n: number, workerName: string) => void;
}): Promise<PayrollPdfEntry[]> {
    const { payrollIds, metaById, supabaseClient, failures, onProgress } = args;
    const n = payrollIds.length;
    const pdfEntries: PayrollPdfEntry[] = [];
    const seenNames = new Map<string, number>();

    for (let idx = 0; idx < payrollIds.length; idx++) {
        const id = payrollIds[idx]!;
        const meta = metaById.get(id);
        const workerNameForProgress = meta?.workerName ?? `payroll-${id}`;
        try {
            if (!meta?.pdfStoragePath) {
                failures.push({
                    payrollId: id,
                    reason: "No stored PDF available",
                });
                onProgress?.(idx + 1, n, workerNameForProgress);
                continue;
            }

            const blob = await downloadPdf(supabaseClient, meta.pdfStoragePath);

            const workerName = meta.workerName ?? `payroll-${id}`;
            const periodStart = isoToDdmmyyyy(isoDate(meta.periodStart ?? ""));
            const periodEnd = isoToDdmmyyyy(isoDate(meta.periodEnd ?? ""));
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
                buffer: Buffer.from(await blob.arrayBuffer()),
            });
        } catch (error) {
            const reason =
                error instanceof Error ? error.message : "Unknown error";
            failures.push({ payrollId: id, reason });
            console.warn(`[payroll/download-zip] PDF download error`, {
                payrollId: id,
                reason,
            });
        }
        onProgress?.(idx + 1, n, workerNameForProgress);
    }

    return pdfEntries;
}

function createNdjsonZipResponseStream(args: {
    payrollIds: string[];
    metaById: Map<string, PayrollMetaRow>;
    supabaseClient: Awaited<ReturnType<typeof createClient>>;
    periodStartForZipLabel: string;
    periodEndForZipLabel: string;
}): ReadableStream<Uint8Array> {
    const {
        payrollIds,
        metaById,
        supabaseClient,
        periodStartForZipLabel,
        periodEndForZipLabel,
    } = args;

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            const encoder = new TextEncoder();
            const enqueueLine = (obj: object) =>
                enqueueNdjsonLine(controller, encoder, obj);

            try {
                enqueueLine({ type: "meta", n: payrollIds.length });

                const failures: PayrollPdfFailure[] = [];
                const pdfEntries = await collectPdfEntries({
                    payrollIds,
                    metaById,
                    supabaseClient,
                    failures,
                    onProgress: (i, n, workerName) => {
                        enqueueLine({ type: "progress", i, n, workerName });
                    },
                });

                const zipName = createZipFilename({
                    periodStart: periodStartForZipLabel,
                    periodEnd: periodEndForZipLabel,
                    partial: failures.length > 0,
                });

                const zip = archiver("zip", { zlib: { level: 9 } });

                zip.on("data", (chunk: Buffer) => {
                    enqueueLine({
                        type: "zip",
                        data: chunk.toString("base64"),
                    });
                });

                await new Promise<void>((resolve, reject) => {
                    zip.on("end", () => resolve());
                    zip.on("error", reject);
                    zip.on("warning", reject);
                    void (async () => {
                        try {
                            for (const entry of pdfEntries) {
                                zip.append(Readable.from(entry.buffer), {
                                    name: entry.name,
                                });
                            }
                            if (failures.length > 0) {
                                const report = formatDownloadErrorsReport(failures);
                                zip.append(report, {
                                    name: "_download-errors.txt",
                                });
                            }
                            await zip.finalize();
                        } catch (e) {
                            reject(e);
                        }
                    })();
                });

                await recordPayrollDownloadWorkflowCompletion();

                enqueueLine({
                    type: "done",
                    filename: zipName,
                    failed: failures.length,
                    skippedIds: failures.map((f) => f.payrollId),
                });
                controller.close();
            } catch (e) {
                enqueueLine({
                    type: "error",
                    message:
                        e instanceof Error ? e.message : "Unknown error",
                });
                try {
                    controller.close();
                } catch {
                    /* already closed */
                }
            }
        },
    });
}

export async function POST(req: NextRequest) {
    const auth = await requireCurrentApiUser();
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
            pdfStoragePath: payrollTable.pdfStoragePath,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .where(inArray(payrollTable.id, payrollIds));

    const metaById = new Map(payrollMeta.map((m) => [m.id, m]));
    const starts = payrollMeta.map((m) => isoDate(m.periodStart));
    const ends = payrollMeta.map((m) => isoDate(m.periodEnd));

    const periodStartForZip =
        starts.length > 0
            ? starts.slice().sort()[0]!
            : dateToLocalIsoYmd();
    const periodEndForZip =
        ends.length > 0
            ? ends.slice().sort().at(-1)!
            : dateToLocalIsoYmd();

    const periodStartForZipLabel = isoToDdmmyyyy(periodStartForZip);
    const periodEndForZipLabel = isoToDdmmyyyy(periodEndForZip);

    const supabaseClient = await createClient();
    const progressNdjson =
        req.nextUrl.searchParams.get("progress") === "1";

    if (progressNdjson) {
        const stream = createNdjsonZipResponseStream({
            payrollIds,
            metaById,
            supabaseClient,
            periodStartForZipLabel,
            periodEndForZipLabel,
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/x-ndjson",
                "Cache-Control": "no-store",
            },
        });
    }

    const failures: PayrollPdfFailure[] = [];
    const pdfEntries = await collectPdfEntries({
        payrollIds,
        metaById,
        supabaseClient,
        failures,
    });

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const zip = archiver("zip", { zlib: { level: 9 } });

            zip.on("data", (chunk: Buffer) =>
                controller.enqueue(new Uint8Array(chunk)),
            );
            zip.on("warning", (err: unknown) => {
                controller.error(err);
            });
            zip.on("error", (err: unknown) => controller.error(err));

            void (async () => {
                try {
                    const zipDone = new Promise<void>((resolve, reject) => {
                        zip.on("end", () => resolve());
                        zip.on("error", reject);
                        zip.on("warning", reject);
                    });

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
                    await zipDone;
                    await recordPayrollDownloadWorkflowCompletion();
                    controller.close();
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

    const headers: Record<string, string> = {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"; filename*=UTF-8''${zipNameStar}`,
        "Cache-Control": "no-store",
    };

    if (failures.length > 0) {
        headers["X-Skipped-Ids"] = failures.map((f) => f.payrollId).join(",");
    }

    return new Response(stream, { headers });
}
