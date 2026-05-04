import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
    createClient: vi.fn(),
    createAdvanceRequestRecord: vi.fn(),
    updateAdvanceRequestRecord: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
    redirect: (...args: unknown[]) => mocks.redirect(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: (...args: unknown[]) =>
        mocks.createClient(...args),
}));

vi.mock("@/services/advance/save-advance-request", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/services/advance/save-advance-request")>();
    return {
        ...actual,
        createAdvanceRequestRecord: (...args: unknown[]) =>
            mocks.createAdvanceRequestRecord(...args),
        updateAdvanceRequestRecord: (...args: unknown[]) =>
            mocks.updateAdvanceRequestRecord(...args),
    };
});

import { createAdvanceRequest } from "@/app/dashboard/advance/new/actions";
import { updateAdvanceRequest } from "@/app/dashboard/advance/[id]/edit/actions";
import { withAdvanceSignatureDates } from "@/services/advance/save-advance-request";

const baseInput = {
    workerId: "worker-1",
    requestDate: "2026-04-20",
    amount: 700,
    purpose: "Emergency cash flow",
    installmentAmounts: [{ amount: 700, repaymentDate: "2026-04-25" }],
};

describe("advance actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.redirect.mockImplementation((url: string) => {
            throw Object.assign(new Error("NEXT_REDIRECT"), {
                digest: `NEXT_REDIRECT;replace;${url};307;`,
            });
        });
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "operator@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
    });

    it("createAdvanceRequest delegates to the service and revalidates related pages", async () => {
        mocks.createAdvanceRequestRecord.mockResolvedValue({
            success: true,
            id: "advance-request-1",
        });

        await expect(createAdvanceRequest(baseInput)).resolves.toEqual({
            success: true,
            id: "advance-request-1",
        });

        expect(mocks.createAdvanceRequestRecord).toHaveBeenCalledWith(
            withAdvanceSignatureDates(baseInput),
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/advance");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/advance/all");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/all");
    });

    it("updateAdvanceRequest delegates to the service and revalidates the detail page", async () => {
        mocks.updateAdvanceRequestRecord.mockResolvedValue({
            success: true,
            id: "advance-request-1",
        });

        await expect(
            updateAdvanceRequest("advance-request-1", {
                ...baseInput,
                installmentAmounts: [
                    {
                        amount: 700,
                        repaymentDate: "2026-04-25",
                        status: "Installment Loan" as const,
                    },
                ],
            }),
        ).resolves.toEqual({
            success: true,
        });

        expect(mocks.updateAdvanceRequestRecord).toHaveBeenCalledWith(
            "advance-request-1",
            withAdvanceSignatureDates({
                ...baseInput,
                installmentAmounts: [
                    {
                        amount: 700,
                        repaymentDate: "2026-04-25",
                        status: "Installment Loan" as const,
                    },
                ],
            }),
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/advance/advance-request-1",
        );
    });

    it("does not revalidate when the shared service returns an error", async () => {
        mocks.createAdvanceRequestRecord.mockResolvedValue({
            success: false,
            error: "Failed to synchronize Draft payrolls",
        });

        await expect(createAdvanceRequest(baseInput)).resolves.toEqual({
            success: false,
            error: "Failed to synchronize Draft payrolls",
        });

        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to /login before mutating when there is no authenticated session", async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: null,
                    },
                    error: null,
                }),
            },
        });

        await expect(createAdvanceRequest(baseInput)).rejects.toMatchObject({
            digest: "NEXT_REDIRECT;replace;/login;307;",
        });

        expect(mocks.createAdvanceRequestRecord).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
});
