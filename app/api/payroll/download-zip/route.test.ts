import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

import { POST } from "@/app/api/payroll/download-zip/route";

describe("POST /api/payroll/download-zip", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: { user: { id: "admin-1" } },
            userId: "admin-1",
        });
    });

    it("passes through shared permission failures", async () => {
        mocks.requireApiPermission.mockResolvedValueOnce(
            new Response("forbidden", { status: 403 }),
        );

        const response = await POST(
            new NextRequest("http://localhost/api/payroll/download-zip", {
                method: "POST",
                body: JSON.stringify({ payrollIds: ["payroll-1"] }),
            }),
        );

        expect(response.status).toBe(403);
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
});
