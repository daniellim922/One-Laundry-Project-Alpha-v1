import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiError } from "@/app/api/_shared/responses";
import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    eq: vi.fn(),
    db: {
        update: vi.fn(),
    },
}));

vi.mock("drizzle-orm", () => ({
    eq: (...args: unknown[]) => mocks.eq(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

import { PATCH } from "@/app/api/advance/[id]/pdf-storage-path/route";

function queueUpdateReturning(rows: { id: string }[]) {
    const returning = vi.fn().mockResolvedValue(rows);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mocks.db.update.mockReturnValue({ set });
}

describe("PATCH /api/advance/[id]/pdf-storage-path", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        queueUpdateReturning([{ id: "adv-1" }]);
    });

    it("updates pdfStoragePath and returns success", async () => {
        const res = await PATCH(
            new Request(
                "http://localhost/api/advance/adv-1/pdf-storage-path",
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        storagePath: "advance/adv-1/voucher.pdf",
                    }),
                },
            ),
            { params: Promise.resolve({ id: "adv-1" }) },
        );

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            ok: true,
            data: {
                id: "adv-1",
                pdfStoragePath: "advance/adv-1/voucher.pdf",
            },
        });
    });

    it("returns VALIDATION_ERROR when storagePath is missing", async () => {
        const res = await PATCH(
            new Request(
                "http://localhost/api/advance/adv-1/pdf-storage-path",
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                },
            ),
            { params: Promise.resolve({ id: "adv-1" }) },
        );

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns NOT_FOUND when advance row is missing", async () => {
        queueUpdateReturning([]);

        const res = await PATCH(
            new Request(
                "http://localhost/api/advance/missing/pdf-storage-path",
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        storagePath: "advance/missing/voucher.pdf",
                    }),
                },
            ),
            { params: Promise.resolve({ id: "missing" }) },
        );

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 when unauthenticated", async () => {
        mocks.requireCurrentApiUser.mockResolvedValueOnce(
            apiError({
                status: 401,
                code: "UNAUTHORIZED",
                message: "Authentication required",
            }),
        );

        const res = await PATCH(
            new Request("http://localhost/api/advance/a1/pdf-storage-path", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storagePath: "advance/a1/voucher.pdf" }),
            }),
            { params: Promise.resolve({ id: "a1" }) },
        );

        expect(res.status).toBe(401);
        expect(mocks.db.update).not.toHaveBeenCalled();
    });
});
