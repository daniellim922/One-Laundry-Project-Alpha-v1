"use client";

export type PayrollZipStreamProgressEvent =
    | { type: "meta"; n: number }
    | { type: "progress"; i: number; n: number; workerName: string }
    | { type: "done"; filename: string; failed: number }
    | { type: "error"; message: string };

export function computeZipEtaSec(args: {
    n: number;
    i: number;
    elapsedSec: number;
    recentDurationsSec: number[];
}): number | undefined {
    const { n, i, elapsedSec, recentDurationsSec } = args;
    if (i < 2 || i >= n) return undefined;
    let avgDelta: number;
    if (recentDurationsSec.length >= 2) {
        avgDelta =
            recentDurationsSec.reduce((a, b) => a + b, 0) /
            recentDurationsSec.length;
    } else {
        avgDelta = elapsedSec / i;
    }
    const eta = Math.round(avgDelta * (n - i));
    if (!Number.isFinite(eta) || eta < 0) return undefined;
    return eta;
}

function base64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(b64);
    const len = binary.length;
    const buffer = new ArrayBuffer(len);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export async function streamPayrollZipFromApi(
    payrollIds: string[],
    onProgress: (event: PayrollZipStreamProgressEvent) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const res = await fetch(
            "/api/payroll/download-zip?progress=1",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/x-ndjson",
                },
                body: JSON.stringify({ payrollIds }),
            },
        );

        if (!res.ok) {
            return {
                ok: false,
                error: `ZIP download failed (${res.status})`,
            };
        }

        const reader = res.body?.getReader();
        if (!reader) {
            return { ok: false, error: "ZIP download failed (no body)" };
        }

        const decoder = new TextDecoder();
        let buffer = "";
        const zipChunks: BlobPart[] = [];

        function handleNdjsonLine(line: string):
            | { outcome: "continue" }
            | { outcome: "success" }
            | { outcome: "fail"; error: string } {
            if (!line.trim()) return { outcome: "continue" };
            let parsed: Record<string, unknown>;
            try {
                parsed = JSON.parse(line) as Record<string, unknown>;
            } catch {
                return { outcome: "fail", error: "Invalid progress stream" };
            }

            const t = parsed.type;
            if (t === "zip" && typeof parsed.data === "string") {
                zipChunks.push(base64ToUint8Array(parsed.data));
                return { outcome: "continue" };
            }

            if (t === "meta") {
                const n = parsed.n;
                if (typeof n !== "number") {
                    return { outcome: "fail", error: "Invalid progress stream" };
                }
                onProgress({ type: "meta", n });
                return { outcome: "continue" };
            }
            if (t === "progress") {
                const i = parsed.i;
                const n = parsed.n;
                const workerName = parsed.workerName;
                if (
                    typeof i !== "number" ||
                    typeof n !== "number" ||
                    typeof workerName !== "string"
                ) {
                    return { outcome: "fail", error: "Invalid progress stream" };
                }
                onProgress({
                    type: "progress",
                    i,
                    n,
                    workerName,
                });
                return { outcome: "continue" };
            }
            if (t === "done") {
                const filename = parsed.filename;
                const failed = parsed.failed;
                if (
                    typeof filename !== "string" ||
                    typeof failed !== "number"
                ) {
                    return { outcome: "fail", error: "Invalid progress stream" };
                }
                onProgress({
                    type: "done",
                    filename,
                    failed,
                });
                const blob = new Blob(zipChunks, {
                    type: "application/zip",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download =
                    filename ||
                    `payrolls-${new Date().toISOString().slice(0, 10)}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                return { outcome: "success" };
            }
            if (t === "error") {
                const message = parsed.message;
                if (typeof message !== "string") {
                    return { outcome: "fail", error: "Invalid progress stream" };
                }
                onProgress({ type: "error", message });
                return { outcome: "fail", error: message };
            }
            return { outcome: "fail", error: "Invalid progress stream" };
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const r = handleNdjsonLine(line);
                if (r.outcome === "success") return { ok: true };
                if (r.outcome === "fail") return { ok: false, error: r.error };
            }
        }

        if (buffer.trim()) {
            const r = handleNdjsonLine(buffer);
            if (r.outcome === "success") return { ok: true };
            if (r.outcome === "fail") return { ok: false, error: r.error };
        }

        return { ok: false, error: "ZIP download ended unexpectedly" };
    } catch (e) {
        console.error(e);
        return { ok: false, error: "Failed to download payroll PDFs" };
    }
}

export function getDownloadFilenameFromContentDisposition(
    header: string | null,
): string | null {
    if (!header) return null;

    const star = header.match(/filename\*\s*=\s*([^;]+)/i);
    if (star?.[1]) {
        const raw = star[1].trim();
        const unquoted = raw.replace(/^"(.*)"$/, "$1");
        const parts = unquoted.split("''");
        const encoded = parts.length === 2 ? parts[1] : unquoted;
        try {
            return decodeURIComponent(encoded);
        } catch {
            return encoded;
        }
    }

    const plain = header.match(/filename\s*=\s*([^;]+)/i);
    if (plain?.[1]) {
        return plain[1].trim().replace(/^"(.*)"$/, "$1");
    }

    return null;
}

export async function downloadPayrollZipFromApi(payrollIds: string[]): Promise<
    { ok: true } | { ok: false; error: string }
> {
    try {
        const res = await fetch("/api/payroll/download-zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payrollIds }),
        });
        if (!res.ok) {
            return {
                ok: false,
                error: `ZIP download failed (${res.status})`,
            };
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
            getDownloadFilenameFromContentDisposition(
                res.headers.get("content-disposition"),
            ) ?? `payrolls-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return { ok: true };
    } catch (e) {
        console.error(e);
        return { ok: false, error: "Failed to download payroll PDFs" };
    }
}
