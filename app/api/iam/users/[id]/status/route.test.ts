import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    updateUserBanStatus: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/iam/update-user-ban-status", () => ({
    updateUserBanStatus: (...args: unknown[]) =>
        mocks.updateUserBanStatus(...args),
}));

import { PATCH } from "@/app/api/iam/users/[id]/status/route";

function makeRequest(body: BodyInit) {
    return new Request("http://localhost/api/iam/users/user-1/status", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body,
    });
}

describe("PATCH /api/iam/users/[id]/status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: null,
            userId: "open-access",
        });
    });

    it("returns 400 for invalid JSON", async () => {
        const response = await PATCH(makeRequest("{") as never, {
            params: Promise.resolve({ id: "user-1" }),
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "INVALID_JSON",
                message: "Invalid JSON",
            },
        });
    });

    it("returns 400 when banned is missing", async () => {
        const response = await PATCH(makeRequest(JSON.stringify({})) as never, {
            params: Promise.resolve({ id: "user-1" }),
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "The 'banned' field must be a boolean.",
            },
        });
        expect(mocks.updateUserBanStatus).not.toHaveBeenCalled();
    });

    it("maps service not found errors to 404", async () => {
        mocks.updateUserBanStatus.mockResolvedValue({
            success: false,
            code: "NOT_FOUND",
            error: "User not found.",
        });

        const response = await PATCH(makeRequest(JSON.stringify({ banned: false })) as never, {
            params: Promise.resolve({ id: "missing-user" }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "NOT_FOUND",
                message: "User not found.",
            },
        });
    });

    it("maps duplicate status transitions to 409", async () => {
        mocks.updateUserBanStatus.mockResolvedValue({
            success: false,
            code: "CONFLICT",
            error: "User is already banned.",
        });

        const response = await PATCH(makeRequest(JSON.stringify({ banned: true })) as never, {
            params: Promise.resolve({ id: "user-1" }),
        });

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "CONFLICT",
                message: "User is already banned.",
            },
        });
    });

    it("returns structured success and revalidates IAM pages", async () => {
        mocks.updateUserBanStatus.mockResolvedValue({
            success: true,
            userId: "user-1",
            banned: false,
        });

        const response = await PATCH(makeRequest(JSON.stringify({ banned: false })) as never, {
            params: Promise.resolve({ id: "user-1" }),
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                userId: "user-1",
                banned: false,
            },
        });
        expect(mocks.updateUserBanStatus).toHaveBeenCalledWith({
            userId: "user-1",
            banned: false,
            reason: undefined,
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            "/dashboard/iam",
            "/dashboard/iam/roles",
        ]);
    });
});
