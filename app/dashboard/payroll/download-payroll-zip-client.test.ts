/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import { streamPayrollZipFromApi } from "@/app/dashboard/payroll/download-payroll-zip-client";

describe("streamPayrollZipFromApi", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("parses NDJSON, reports progress events, and downloads a ZIP blob", async () => {
        const progressEvents: string[] = [];
        const lines = [
            JSON.stringify({ type: "meta", n: 1 }),
            JSON.stringify({
                type: "progress",
                i: 1,
                n: 1,
                workerName: "Bob",
            }),
            JSON.stringify({
                type: "zip",
                data: Buffer.from([0x50, 0x4b, 3, 4]).toString("base64"),
            }),
            JSON.stringify({
                type: "done",
                filename: "out.zip",
                failed: 0,
            }),
        ];
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (const line of lines) {
                    controller.enqueue(encoder.encode(`${line}\n`));
                }
                controller.close();
            },
        });

        const mockClick = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(() => {});

        const blobs: Blob[] = [];
        vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
            blobs.push(blob as Blob);
            return "blob:mock";
        });
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

        global.fetch = vi.fn().mockResolvedValue(
            new Response(stream, {
                status: 200,
                headers: { "Content-Type": "application/x-ndjson" },
            }),
        );

        const result = await streamPayrollZipFromApi(["p1"], (evt) => {
            progressEvents.push(evt.type);
        });

        expect(result).toEqual({ ok: true });
        expect(progressEvents).toEqual(["meta", "progress", "done"]);
        expect(blobs[0]?.type).toBe("application/zip");
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
});
