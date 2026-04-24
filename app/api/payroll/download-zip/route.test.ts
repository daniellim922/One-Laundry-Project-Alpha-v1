import { Buffer } from "node:buffer";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    recordGuidedMonthlyWorkflowStepCompletion: vi.fn(),
    db: {
        select: vi.fn(),
    },
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    recordGuidedMonthlyWorkflowStepCompletion: (...args: unknown[]) =>
        mocks.recordGuidedMonthlyWorkflowStepCompletion(...args),
}));

import { POST } from "@/app/api/payroll/download-zip/route";

describe("POST /api/payroll/download-zip", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireCurrentApiUser.mockResolvedValue({
            email: "operator@example.com",
        });
        mocks.db.select.mockReturnValue({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            id: "payroll-1",
                            periodStart: "2026-01-01",
                            periodEnd: "2026-01-31",
                            workerName: "Alice",
                        },
                    ]),
                }),
            }),
        });
        global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("/pdf?mode=summary")) {
                return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
                    status: 200,
                });
            }
            return new Response(null, { status: 404 });
        });
    });

    it("returns INVALID_JSON for malformed payloads", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/payroll/download-zip", {
                method: "POST",
                body: "{",
            }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "INVALID_JSON",
                message: "Invalid JSON",
                details: undefined,
            },
        });
    });

    it("returns VALIDATION_ERROR when payrollIds is empty", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/payroll/download-zip", {
                method: "POST",
                body: JSON.stringify({ payrollIds: [] }),
            }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "No payrollIds provided",
                details: undefined,
            },
        });
    });

    it("streams NDJSON with meta, progress, zip frames, and done when progress=1", async () => {
        const response = await POST(
            new NextRequest(
                "http://localhost/api/payroll/download-zip?progress=1",
                {
                    method: "POST",
                    body: JSON.stringify({ payrollIds: ["payroll-1"] }),
                },
            ),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
            "application/x-ndjson",
        );

        const text = await response.text();
        const lines = text
            .trim()
            .split("\n")
            .filter((l) => l.length > 0);
        expect(lines.length).toBeGreaterThanOrEqual(3);

        const first = JSON.parse(lines[0]!) as { type: string; n?: number };
        expect(first.type).toBe("meta");
        expect(first.n).toBe(1);

        const progressLines = lines
            .map((l) => JSON.parse(l) as { type: string })
            .filter((o) => o.type === "progress");
        expect(progressLines.length).toBeGreaterThanOrEqual(1);

        let zipBuf = Buffer.alloc(0);
        for (const line of lines) {
            const o = JSON.parse(line) as { type: string; data?: string };
            if (o.type === "zip" && typeof o.data === "string") {
                zipBuf = Buffer.concat([zipBuf, Buffer.from(o.data, "base64")]);
            }
        }
        expect(zipBuf.length).toBeGreaterThan(0);
        expect(zipBuf[0]).toBe(0x50);
        expect(zipBuf[1]).toBe(0x4b);

        const last = JSON.parse(lines[lines.length - 1]!) as {
            type: string;
            filename?: string;
        };
        expect(last.type).toBe("done");
        expect(typeof last.filename).toBe("string");
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledWith({
            stepId: "payroll_download",
        });
    });

    it("records guided workflow completion after the standard ZIP stream completes", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/payroll/download-zip", {
                method: "POST",
                body: JSON.stringify({ payrollIds: ["payroll-1"] }),
            }),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/zip");

        const zipBuffer = Buffer.from(await response.arrayBuffer());
        expect(zipBuffer.length).toBeGreaterThan(0);
        expect(zipBuffer[0]).toBe(0x50);
        expect(zipBuffer[1]).toBe(0x4b);
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledWith({
            stepId: "payroll_download",
        });
    });
});
